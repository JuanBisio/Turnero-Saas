/**
 * API Route: Create External Appointment (n8n → App)
 * POST /api/v1/admin/appointments/external
 * 
 * Allows n8n to create appointments using API key authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { generateCancellationToken, generateWebhookSecret, buildCreatedPayload, sendWebhook, formatWithTimezone } from '@/lib/webhooks/webhookUtils'
import { logWebhook } from '@/lib/webhooks/logWebhook'
import { addDays, isBefore, isAfter, addMinutes } from 'date-fns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Rate limiting store (simple in-memory, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(shopId: string, limit: number = 100): boolean {
  const now = Date.now()
  const key = `ratelimit:${shopId}`
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    // Reset window (1 minute)
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + 60000,
    })
    return true
  }

  if (record.count >= limit) {
    return false // Rate limit exceeded
  }

  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validate API Key
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing API key', code: 'INVALID_API_KEY' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find shop by API key
    const { data: _shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('api_key_n8n', apiKey)
      .single()

    if (shopError || !_shop) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 401 }
      )
    }

    const shop = _shop as any

    // 2. Rate limiting
    if (!checkRateLimit(shop.id)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded (100 req/min)', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      )
    }

    // 3. Parse request body
    const body = await request.json()
    const { professional_id, service_id, start_time, customer_name, customer_phone, customer_email, notes } = body

    if (!professional_id || !service_id || !start_time || !customer_name || !customer_phone || !customer_email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    // 4. Validate professional belongs to shop
    const { data: _professional, error: profError } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', professional_id)
      .eq('shop_id', shop.id) // shop is already any, so this is fine
      .eq('is_active', true)
      .single()

    if (profError || !_professional) {
      return NextResponse.json(
        { success: false, error: 'Professional not found', code: 'PROFESSIONAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    const professional = _professional as any

    // 5. Validate service belongs to shop
    const { data: _service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .eq('shop_id', shop.id)
      .single()

    if (serviceError || !_service) {
      return NextResponse.json(
        { success: false, error: 'Service not found', code: 'SERVICE_NOT_FOUND' },
        { status: 404 }
      )
    }
    
    const service = _service as any

    // 6. Validate date is within 30-day window
    const startDate = new Date(start_time)
    const today = new Date()
    const maxDate = addDays(today, 30)

    if (isBefore(startDate, today) || isAfter(startDate, maxDate)) {
      return NextResponse.json(
        { success: false, error: 'Date must be within next 30 days', code: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    // 7. Calculate end time
    const totalDuration = service.duration_minutes + professional.buffer_time_minutes
    const endDate = addMinutes(startDate, totalDuration)

    // 8. Check slot availability (simplified - should use getAvailableSlots for full validation)
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional_id', professional_id)
      .neq('status', 'cancelado')
      .gte('start_time', startDate.toISOString())
      .lt('start_time', endDate.toISOString())

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Slot unavailable', code: 'SLOT_UNAVAILABLE' },
        { status: 409 }
      )
    }

    // 9. Create appointment
    const cancellationToken = generateCancellationToken(crypto.randomUUID())

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        shop_id: shop.id,
        professional_id: professional.id,
        service_id: service.id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        customer_name,
        customer_phone,
        customer_email,
        status: 'pendiente',
        cancellation_token: cancellationToken,
      })
      .select()
      .single()

    if (aptError || !appointment) {
      console.error('Failed to create appointment:', aptError)
      return NextResponse.json(
        { success: false, error: 'Failed to create appointment', code: 'CREATE_FAILED' },
        { status: 500 }
      )
    }

    // 10. Send webhook if enabled
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    if (shop.webhook_enabled && shop.webhook_url) {
      const webhookPayload = buildCreatedPayload({
        shop,
        appointment,
        customer: { name: customer_name, phone: customer_phone, email: customer_email },
        professional,
        service,
        cancellationToken,
        baseUrl,
      })

      const webhookSecret = generateWebhookSecret(shop.id)
      const result = await sendWebhook(shop.webhook_url, webhookPayload, webhookSecret)

      // Log webhook
      await logWebhook({
        shopId: shop.id,
        eventType: 'appointment.created',
        payload: webhookPayload,
        url: shop.webhook_url,
        statusCode: result.statusCode,
        success: result.success,
        errorMessage: result.error,
        attempts: result.attempts,
      })
    }

    // 11. Return response
    const cancellationUrl = `${baseUrl}/widget/${shop.slug}/cancelar/${cancellationToken}`

    return NextResponse.json(
      {
        success: true,
        appointment: {
          id: appointment.id,
          status: appointment.status,
          start_time: formatWithTimezone(appointment.start_time, shop.timezone || 'America/Argentina/Buenos_Aires'),
          end_time: formatWithTimezone(appointment.end_time, shop.timezone || 'America/Argentina/Buenos_Aires'),
          cancellation_token: cancellationToken,
          cancellation_url: cancellationUrl,
        },
        customer: {
          name: customer_name,
          phone: customer_phone,
          email: customer_email,
        },
        professional: {
          id: professional.id,
          name: professional.name,
        },
        service: {
          id: service.id,
          name: service.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in external appointments API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
