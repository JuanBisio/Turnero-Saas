/**
 * API Route: Trigger Webhook After Appointment Creation
 * POST /api/v1/webhooks/trigger
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWebhookSecret, buildCreatedPayload, sendWebhook } from '@/lib/webhooks/webhookUtils'
import { logWebhook } from '@/lib/webhooks/logWebhook'
import { sendAppointmentConfirmation } from '@/lib/whatsapp/notificationService'

export async function POST(request: NextRequest) {
  try {
    const { event, appointmentId } = await request.json()

    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch full appointment data with relations
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        shop:shops(*),
        professional:professionals(id, name),
        service:services(id, name, duration_minutes, price)
      `)
      .eq('id', appointmentId)
      .single()

    if (error || !appointment) {
      console.error('Appointment not found:', error)
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const shop = appointment.shop

    // ✅ Volvemos a void para evitar timeouts en DB Hooks de Supabase.
    // Investigamos por qué no llega el mensaje con logs ruidosos.
    void sendAppointmentConfirmation({
      appointmentId: appointment.id,
      clientName: appointment.customer_name,
      clientPhone: appointment.customer_phone,
      serviceName: appointment.service?.name ?? 'Servicio',
      professionalName: appointment.professional?.name ?? 'Profesional',
      datetime: appointment.start_time,
    }).catch(err =>
      console.error('[route] Error de fondo en notificación WhatsApp:', err)
    )

    // Only send webhook if enabled
    if (!shop.webhook_enabled || !shop.webhook_url) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const webhookPayload = buildCreatedPayload({
      shop,
      appointment,
      customer: {
        name: appointment.customer_name,
        phone: appointment.customer_phone,
        email: appointment.customer_email,
      },
      professional: appointment.professional,
      service: appointment.service,
      cancellationToken: appointment.cancellation_token,
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

    return NextResponse.json({ success: result.success })
  } catch (error) {
    console.error('Error triggering webhook:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
