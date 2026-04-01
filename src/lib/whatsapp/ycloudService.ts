/**
 * Cliente HTTP para la API de mensajería de YCloud.
 * Implementa reintentos con backoff exponencial para errores transitorios.
 * Errores definitivos 4xx se propagan inmediatamente sin reintentar.
 */

import type { YCloudTemplateRequest, YCloudTemplateResponse } from '@/types/ycloud'
import { ycloudConfig } from './config'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1_000 // 1s → 2s → 4s

/**
 * Determina si un error HTTP es transitorio y merece reintento.
 * Los errores 4xx son definitivos (bad request, auth, etc.) — no se reintentan.
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof YCloudClientError) {
    return error.statusCode >= 500
  }
  // Errores de red, timeout (AbortError) → transitorios
  return true
}

/** Error tipado para respuestas HTTP de YCloud con status code accesible */
export class YCloudClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message)
    this.name = 'YCloudClientError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Envía un mensaje de template de WhatsApp a través de la API de YCloud.
 * Reintenta hasta MAX_RETRIES veces ante errores transitorios (5xx, red, timeout).
 * Lanza YCloudClientError inmediatamente ante errores 4xx sin reintentar.
 *
 * @param payload - Datos del template a enviar
 * @param attempt - Intento actual (uso interno para recursión)
 * @throws {YCloudClientError} En fallos definitivos o si se agotan los reintentos
 */
export async function sendTemplateMessage(
  payload: YCloudTemplateRequest,
  attempt = 1
): Promise<YCloudTemplateResponse> {
  const body = {
    messaging_product: "whatsapp",
    from: payload.from ?? ycloudConfig.defaultSender,
    to: payload.to,
    type: "template",
    template: {
      name: payload.template_name,
      language: {
        code: "es_AR",
      },
      components: [
        {
          type: "body",
          parameters: Object.values(payload.parameters).map((value) => ({
            type: "text",
            text: value,
          })),
        },
      ],
    },
  };

  console.log(
    `[YCloud] Enviando mensaje DESDE: ${body.from} HACIA: ${body.to} (intento ${attempt})`
  );
  const url = `${ycloudConfig.baseUrl}/whatsapp/messages`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ycloudConfig.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    })

    // Error definitivo 4xx → no reintentar, lanzar inmediatamente
    if (response.status >= 400 && response.status < 500) {
      const errorBody: unknown = await response.json().catch(() => null)
      throw new YCloudClientError(
        response.status,
        `[YCloud] Error ${response.status} al enviar mensaje`,
        errorBody
      )
    }

    // Error transitorio 5xx → reintentable
    if (!response.ok) {
      throw new YCloudClientError(
        response.status,
        `[YCloud] Error de servidor ${response.status} (transitorio)`
      )
    }

    return response.json() as Promise<YCloudTemplateResponse>

  } catch (error) {
    // Si se agotaron los reintentos o es un error definitivo → propagar
    if (!isTransientError(error) || attempt >= MAX_RETRIES) {
      throw error
    }

    // Backoff exponencial: 1s, 2s, 4s
    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
    console.warn(
      `[YCloud] Reintento ${attempt}/${MAX_RETRIES} en ${delay}ms.`,
      error instanceof Error ? error.message : error
    )
    await sleep(delay)

    return sendTemplateMessage(payload, attempt + 1)
  }
}
