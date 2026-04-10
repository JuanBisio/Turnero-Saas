import { NextRequest, NextResponse } from "next/server";
import { verifyYCloudSignature } from "@/lib/whatsapp/signatureVerifier";
import { createClient } from "@supabase/supabase-js";
import { YCloudInboundEvent } from "@/types/ycloud";

/**
 * Endpoint de Webhook para recibir mensajes de WhatsApp desde YCloud.
 * Flujo de n8n migrado:Recibe -> Valida Firma -> Guarda en DB vía RPC.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("ycloud-signature") ?? "";

  // 1. Verificar firma (Seguridad)
  const webhookSecret = process.env.YCLOUD_WEBHOOK_SECRET;
  const isValid = verifyYCloudSignature(
    rawBody,
    signatureHeader,
    webhookSecret || ""
  );

  if (!isValid) {
    console.warn("[Inbound] Firma inválida rechazada o Secreto no configurado");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parsear evento
  const event: YCloudInboundEvent = JSON.parse(rawBody);
  
  // Ignorar si no es un mensaje (ej: confirmación de webhook o entrega)
  if (!event.whatsappInboundMessage) {
    return NextResponse.json({ ok: true });
  }

  const msg = event.whatsappInboundMessage;

  // 3. Guardar en DB vía RPC usando Service Role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc("handle_inbound_message", {
    p_phone: msg.from,
    p_name: msg.customerProfile?.name ?? "Desconocido",
    p_content: msg.text?.body ?? extractInteractiveText(msg),
    p_y_id: msg.id,
    p_shop_slug: "demo" // Podría ser dinámico en el futuro
  });

  if (error) {
    console.error("[Inbound] Error al guardar en DB:", error.message);
    return NextResponse.json({ error: "DB Error", details: error.message }, { status: 500 });
  }

  console.info(`[Inbound] Mensaje guardado OK: ${msg.id} de ${msg.from}`);
  return NextResponse.json({ ok: true, data });
}

/**
 * Extrae el texto de respuestas interactivas (botones o listas).
 */
function extractInteractiveText(msg: YCloudInboundEvent["whatsappInboundMessage"]): string {
  if (!msg.interactive) return "Mensaje no soportado";
  
  const reply = 
    msg.interactive.list_reply?.id || 
    msg.interactive.button_reply?.id || 
    msg.interactive.list_reply?.title ||
    msg.interactive.button_reply?.title ||
    "Interacción";
    
  return reply;
}
