/**
 * Orquestador de notificaciones de WhatsApp para confirmaciones de turnos.
 * 
 * Responsabilidades:
 *  - Coordinar formateo de teléfono y fecha
 *  - Invocar el envío a través de ycloudService
 *  - Registrar el resultado en Supabase (auditoría)
 * 
 * Garantías:
 *  - NUNCA lanza excepciones hacia afuera (todos los errores se capturan internamente)
 *  - El fallo de WhatsApp no afecta el flujo principal del webhook
 */

import { createClient } from '@supabase/supabase-js'
import type { AppointmentNotificationPayload } from '@/types/ycloud'
import { formatPhone, formatDateTime } from './whatsappUtils'
import { sendTemplateMessage } from './ycloudService'

export type NotificationStatus = 'success' | 'failed'

/**
 * Crea un cliente Supabase con service role para operaciones de backend.
 * No depende de cookies ni del ciclo de request de Next.js.
 */
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      '[Notifications] NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas.'
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

/**
 * Punto de entrada único para enviar confirmaciones de turno por WhatsApp.
 * 
 * Orquesta formateo → envío → logging. No lanza excepciones hacia afuera.
 * El resultado (success o failed) siempre se registra en `notification_logs`.
 * 
 * @param payload - Datos del turno a notificar
 */
export async function sendAppointmentConfirmation(
  payload: AppointmentNotificationPayload
): Promise<void> {
  console.log(`[Notifications] Inicia proceso para turno: ${payload.appointmentId}`)
  let status: NotificationStatus = 'failed'
  let errorMessage: string | null = null

  try {
    // 1. Formatear teléfono y fecha/hora
    const phone = formatPhone(payload.clientPhone)
    const { date, time } = formatDateTime(payload.datetime)

    // 2. Enviar template a YCloud (con reintentos internos en caso de 5xx)
    await sendTemplateMessage({
      to: phone,
      template_name: 'confirmacion_turno',
      from: payload.shopSender,
      parameters: {
        p1_name: payload.clientName,
        p2_service: payload.serviceName,
        p3_date: date,
        p4_time: time,
        p5_prof: payload.professionalName,
      },
    })

    status = 'success'
    console.info(
      `[Notifications] WhatsApp enviado OK → turno ${payload.appointmentId}`
    )

  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error)
    console.error(
      `[Notifications] Fallo WhatsApp → turno ${payload.appointmentId}:`,
      errorMessage
    )
  } finally {
    // 3. Registrar resultado en Supabase (siempre, independientemente del resultado)
    try {
      const supabase = createAdminClient()

      const { error: dbError } = await supabase.from('notification_logs').insert({
        appointment_id: payload.appointmentId,
        channel: 'whatsapp',
        status,
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
      })

      if (dbError) {
        console.error(
          `[Notifications] Error al registrar log → turno ${payload.appointmentId}:`,
          dbError.message
        )
      }
    } catch (logError) {
      // Fallo de logging: no propagar, solo registrar en consola
      console.error(
        `[Notifications] Error crítico en logging → turno ${payload.appointmentId}:`,
        logError instanceof Error ? logError.message : logError
      )
    }
  }
}
