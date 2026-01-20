/**
 * API Route: Cancel Appointment
 * POST /api/v1/appointments/cancel
 * 
 * Cancels an appointment and triggers webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateWebhookSecret, buildCancelledPayload, sendWebhook } from '@/lib/webhooks/webhookUtils'
import { logWebhook } from '@/lib/webhooks/logWebhook'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing cancellation token' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find appointment
    const { data: appointment, error: findError } = await supabase
      .from('appointments')
      .select(`
        *,
        shop:shops(*),
        professional:professionals(id, name),
        service:services(id, name, duration_minutes, price)
      `)
      .eq('cancellation_token', token)
      .single()

    if (findError || !appointment) {
      return NextResponse.json(
        { error: 'Invalid cancellation token' },
        { status: 404 }
      )
    }

    if (appointment.status === 'cancelado') {
      return NextResponse.json(
        { error: 'Appointment already cancelled' },
        { status: 400 }
      )
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'cancelado' })
      .eq('id', appointment.id)

    if (updateError) {
      console.error('Failed to cancel appointment:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel appointment' },
        { status: 500 }
      )
    }

    // Trigger webhook if enabled
    const shop = appointment.shop
    
    if (shop.webhook_enabled && shop.webhook_url) {
      const webhookPayload = buildCancelledPayload({
        shop,
        appointment,
        customer: {
          name: appointment.customer_name,
          phone: appointment.customer_phone,
          email: appointment.customer_email,
        },
        professional: appointment.professional,
        service: appointment.service,
        cancelledBy: 'customer',
      })

      const webhookSecret = generateWebhookSecret(shop.id)
      const result = await sendWebhook(shop.webhook_url, webhookPayload, webhookSecret)

      // Log webhook
      await logWebhook({
        shopId: shop.id,
        eventType: 'appointment.cancelled',
        payload: webhookPayload,
        url: shop.webhook_url,
        statusCode: result.statusCode,
        success: result.success,
        errorMessage: result.error,
        attempts: result.attempts,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in cancel API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
