/**
 * Servicio de envío de emails de confirmación de turno.
 * Usa la API HTTP de Resend directamente (sin paquete npm adicional).
 * Requiere: RESEND_API_KEY, opcional EMAIL_FROM.
 */

const RESEND_API = 'https://api.resend.com/emails'

export interface AppointmentEmailPayload {
  to: string
  clientName: string
  shopName: string
  date: string
  time: string
  serviceName: string
  professionalName: string
  shopLocation?: string
  replyTo?: string
}

function buildHtml(p: AppointmentEmailPayload): string {
  const locationRow = p.shopLocation
    ? `<p style="margin:24px 0 0;color:#71717a;font-size:14px;">📍 ${p.shopLocation}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="background:#f9fafb;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#18181b;padding:32px 40px;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">¡Tu turno está confirmado!</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#3f3f46;margin:0 0 24px;">Hola <strong>${p.clientName}</strong>, aquí están los detalles de tu reserva en <strong>${p.shopName}</strong>:</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:14px;">Servicio</td>
          <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;color:#18181b;font-weight:500;text-align:right;">${p.serviceName}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:14px;">Profesional</td>
          <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;color:#18181b;font-weight:500;text-align:right;">${p.professionalName}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:14px;">Fecha</td>
          <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;color:#18181b;font-weight:500;text-align:right;">${p.date}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#71717a;font-size:14px;">Hora</td>
          <td style="padding:12px 0;color:#18181b;font-weight:500;text-align:right;">${p.time}</td>
        </tr>
      </table>
      ${locationRow}
    </div>
    <div style="background:#fafafa;padding:24px 40px;border-top:1px solid #f4f4f5;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;">
        Este correo fue enviado por Turnero Saas en nombre de ${p.shopName}.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendAppointmentConfirmationEmail(
  payload: AppointmentEmailPayload
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('[Email] RESEND_API_KEY no configurada.')
  }

  const from = process.env.EMAIL_FROM ?? 'Turnero <onboarding@resend.dev>'

  const toOverride = process.env.EMAIL_TO_OVERRIDE
  const to = toOverride ? [toOverride] : [payload.to]

  if (toOverride) {
    console.info(`[Email] OVERRIDE: Enviando a ${toOverride} en lugar de ${payload.to}`)
  }

  const body: Record<string, unknown> = {
    from,
    to,
    subject: `Confirmación de turno en ${payload.shopName}`,
    html: buildHtml(payload),
  }

  if (payload.replyTo) {
    body.reply_to = payload.replyTo
  }

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`[Email] Error ${response.status}: ${errorText}`)
  }

  console.info(`[Email] Confirmación enviada a ${payload.to}`)
}
