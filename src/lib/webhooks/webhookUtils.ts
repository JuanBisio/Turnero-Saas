/**
 * Webhook Utilities
 * Functions for generating secrets, building payloads, and sending webhooks
 */

import crypto from 'crypto'
import { formatInTimeZone } from 'date-fns-tz'

/**
 * Generate webhook secret for a shop
 */
export function generateWebhookSecret(shopId: string): string {
  const masterSecret = process.env.WEBHOOK_MASTER_SECRET || 'default-secret-change-me'
  
  return crypto
    .createHash('sha256')
    .update(`${shopId}-${masterSecret}`)
    .digest('hex')
    .substring(0, 32)
}

/**
 * Generate cancellation token for an appointment
 */
export function generateCancellationToken(appointmentId: string): string {
  const secret = process.env.CANCELLATION_SECRET || 'cancellation-secret-change-me'
  
  return crypto
    .createHash('sha256')
    .update(`${appointmentId}-${Date.now()}-${secret}`)
    .digest('hex')
    .substring(0, 32)
}

/**
 * Format date to ISO with timezone
 */
export function formatWithTimezone(date: Date | string, timezone: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(dateObj, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX")
}

/**
 * Build webhook payload for appointment.created event
 */
export function buildCreatedPayload(params: {
  shop: any
  appointment: any
  customer: any
  professional: any
  service: any
  cancellationToken: string
  baseUrl: string
}): any {
  const { shop, appointment, customer, professional, service, cancellationToken, baseUrl } = params
  const timezone = shop.timezone || 'America/Argentina/Buenos_Aires'
  
  return {
    event: 'appointment.created',
    timestamp: formatWithTimezone(new Date(), timezone),
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      timezone: timezone,
    },
    appointment: {
      id: appointment.id,
      status: appointment.status,
      start_time: formatWithTimezone(appointment.start_time, timezone),
      end_time: formatWithTimezone(appointment.end_time, timezone),
      cancellation_token: cancellationToken,
      cancellation_url: `${baseUrl}/widget/${shop.slug}/cancelar/${cancellationToken}`,
    },
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    professional: {
      id: professional.id,
      name: professional.name,
    },
    service: {
      id: service.id,
      name: service.name,
      duration_minutes: service.duration_minutes,
      price: service.price,
    },
  }
}

/**
 * Build webhook payload for appointment.cancelled event
 */
export function buildCancelledPayload(params: {
  shop: any
  appointment: any
  customer: any
  professional: any
  service: any
  cancelledBy: 'customer' | 'admin'
}): any {
  const { shop, appointment, customer, professional, service, cancelledBy } = params
  const timezone = shop.timezone || 'America/Argentina/Buenos_Aires'
  
  return {
    event: 'appointment.cancelled',
    timestamp: formatWithTimezone(new Date(), timezone),
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      timezone: timezone,
    },
    appointment: {
      id: appointment.id,
      status: 'cancelado',
      start_time: formatWithTimezone(appointment.start_time, timezone),
      end_time: formatWithTimezone(appointment.end_time, timezone),
      cancelled_at: formatWithTimezone(new Date(), timezone),
    },
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    professional: {
      id: professional.id,
      name: professional.name,
    },
    service: {
      id: service.id,
      name: service.name,
      duration_minutes: service.duration_minutes,
      price: service.price,
    },
    cancelled_by: cancelledBy,
  }
}

/**
 * Build test webhook payload
 */
export function buildTestPayload(shop: any): any {
  const timezone = shop.timezone || 'America/Argentina/Buenos_Aires'
  
  return {
    event: 'webhook.test',
    timestamp: formatWithTimezone(new Date(), timezone),
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
    },
    message: 'Este es un webhook de prueba desde Turnero SaaS',
  }
}

/**
 * Send webhook with retry logic
 */
export async function sendWebhook(
  webhookUrl: string,
  payload: any,
  secret: string,
  maxRetries: number = 3
): Promise<{
  success: boolean
  statusCode?: number
  error?: string
  attempts: number
}> {
  let lastError: string | undefined
  let lastStatusCode: number | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': secret,
          'User-Agent': 'TurneroSaaS/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      lastStatusCode = response.status

      if (response.ok) {
        console.log(`✅ Webhook sent successfully on attempt ${attempt}`)
        return {
          success: true,
          statusCode: response.status,
          attempts: attempt,
        }
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`
      console.warn(`⚠️ Webhook failed on attempt ${attempt}: ${lastError}`)
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Webhook attempt ${attempt} failed:`, lastError)
    }

    // Wait before retry (exponential backoff: 1s, 2s, 3s)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000))
    }
  }

  console.error(`🚨 Webhook failed after ${maxRetries} attempts`)
  return {
    success: false,
    statusCode: lastStatusCode,
    error: lastError,
    attempts: maxRetries,
  }
}
