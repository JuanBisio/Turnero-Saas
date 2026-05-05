import { YCloudOutboundMessage } from "@/types/ycloud";

const YCLOUD_BASE = "https://api.ycloud.com/v2";

/**
 * Cliente simple para enviar mensajes a través de YCloud.
 * Soporta Text e Interactive (listas/botones).
 */
export async function sendWhatsAppMessage(
  payload: YCloudOutboundMessage,
  apiKey?: string
): Promise<{ id: string; status: string }> {

  const key = apiKey ?? process.env.YCLOUD_API_KEY;
  if (!key) {
    throw new Error("[YCloud] YCLOUD_API_KEY no configurada.");
  }

  const response = await fetch(`${YCLOUD_BASE}/whatsapp/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[YCloud] Error HTTP ${response.status}:`, errorText);
    throw new Error(`[YCloud] Error al enviar mensaje: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Helper para construir un mensaje de texto simple.
 */
export function buildTextMessage(to: string, body: string): YCloudOutboundMessage {
  const sender = process.env.YCLOUD_DEFAULT_SENDER;
  if (!sender) {
    throw new Error("[YCloud] YCLOUD_DEFAULT_SENDER no configurado.");
  }
  return {
    messaging_product: "whatsapp",
    to,
    from: sender,
    type: "text",
    text: { body },
  };
}
