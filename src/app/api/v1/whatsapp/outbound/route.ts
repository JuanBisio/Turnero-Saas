import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, buildTextMessage } from "@/lib/whatsapp/ycloudClient";
import { createClient } from "@supabase/supabase-js";

interface OutboundRequest {
  contact_id: string;  // ID del contacto en la DB
  recipient: string;   // Número destino (+54...)
  message: string;     // Contenido del mensaje
}

/**
 * Endpoint para enviar mensajes de WhatsApp desde el Dashboard (Chat).
 * Flujo de n8n migrado:Recibe -> Envía a YCloud -> Loguea en DB.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: OutboundRequest = await request.json();

    if (!body.recipient || !body.message || !body.contact_id) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    // 1. Enviar mensaje a YCloud
    let yCloudResponse: { id: string; status: string };
    try {
      const payload = buildTextMessage(body.recipient, body.message);
      yCloudResponse = await sendWhatsAppMessage(payload);
    } catch (error) {
      console.error("[Outbound] Error enviando a YCloud:", error);
      return NextResponse.json({ 
        error: "Fallo el envío a YCloud", 
        details: error instanceof Error ? error.message : "Error desconocido" 
      }, { status: 502 });
    }

    // 2. Loguear en DB vía RPC (no bloqueamos la respuesta exitosa)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ejecución asincrónica sin await para respuesta inmediata (Vercel no lo termina si es rápido)
    // Pero como es crítico, mejor lo esperamos para asegurar el log.
    const { error: dbError } = await supabase.rpc("handle_outbound_message", {
      p_contact_id: body.contact_id,
      p_content: body.message,
      p_y_id: yCloudResponse.id,
    });

    if (dbError) {
      console.error("[Outbound] Error logueando en DB:", dbError.message);
    }

    return NextResponse.json({ 
      ok: true, 
      messageId: yCloudResponse.id,
      status: yCloudResponse.status 
    });

  } catch (error) {
    console.error("[Outbound] Error crítico:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
