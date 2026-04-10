import { NextRequest, NextResponse } from "next/server";
import { verifyYCloudSignature } from "@/lib/whatsapp/signatureVerifier";
import { createClient } from "@supabase/supabase-js";
import { YCloudInboundEvent, YCloudOutboundMessage } from "@/types/ycloud";
import { getOrCreateSession, updateSession, resetSession } from "@/lib/whatsapp/sessionManager";
import { getShopContext } from "@/lib/whatsapp/shopContext";
import { interpretMessage } from "@/lib/whatsapp/aiInterpreter";
import { runStateMachine } from "@/lib/whatsapp/stateMachine";
import { sendWhatsAppMessage } from "@/lib/whatsapp/ycloudClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Orquestador Principal del Bot de IA (Flujo 1 de n8n Migrado).
 * Tareas: Seguridad -> Contexto -> IA -> Estados -> Acción -> Respuesta.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("ycloud-signature") ?? "";

  try {
    // 1. Validar Firma
    if (!verifyYCloudSignature(rawBody, signature, process.env.YCLOUD_WEBHOOK_SECRET || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event: YCloudInboundEvent = JSON.parse(rawBody);
    if (!event.whatsappInboundMessage) return NextResponse.json({ ok: true });

    const msg = event.whatsappInboundMessage;
    const phone = msg.from;
    const userText = msg.text?.body ?? extractText(msg);
    const userName = msg.customerProfile?.name ?? "Cliente";

    // 2. Cargar Contexto de Sesión y Negocio en paralelo
    const [session, shopCtx] = await Promise.all([
      getOrCreateSession(phone),
      getShopContext("demo", phone),
    ]);

    const todayDate = new Date().toISOString().split("T")[0];

    // 3. IA: Interpretar intención del mensaje
    const aiResult = await interpretMessage({
      userMessage: userText,
      shopName: shopCtx.shop_name,
      services: shopCtx.services,
      professionals: shopCtx.professionals,
      todayDate,
      currentState: session.current_state,
      currentIntent: session.intent,
      sessionService: session.service,
      sessionProfessional: session.professional,
      sessionDate: session.preferred_date,
    });

    // 4. Máquina de Estados: Determinar siguiente paso
    const machine = runStateMachine({
      userMessage: userText,
      userName,
      sender: phone,
      shopContext: shopCtx,
      session,
      aiResult,
      todayDate,
    });

    // 5. Ejecutar Acción según routeTo
    let finalResponse: YCloudOutboundMessage | null = machine.response;

    // Caso especial: usuario envía UUID mientras espera selección de cancelación
    if (session.current_state === "AWAITING_CANCEL_SELECTION" && isUUID(userText)) {
      finalResponse = await handleCancellation(userText, phone);
      await resetSession(phone);
    } else if (machine.routeTo === 1) {
      // Buscar horarios disponibles
      finalResponse = await fetchTimesResponse(machine.context);
      await updateSession(phone, machine.updatedSession);
    } else if (machine.routeTo === 2) {
      // Confirmar reserva
      finalResponse = await bookAndRespond(machine.context, phone);
      await resetSession(phone);
    } else if (machine.routeTo === 3) {
      // Mostrar turnos para cancelar
      finalResponse = await fetchAppointmentsResponse(phone, shopCtx.shop_name);
      await updateSession(phone, machine.updatedSession);
    } else {
      // Respuesta directa (routeTo === 0)
      await updateSession(phone, machine.updatedSession);
    }

    // 6. Loguear mensaje entrante en bandeja
    await supabase.rpc("handle_inbound_message", {
      p_phone: phone,
      p_name: userName,
      p_content: userText,
      p_y_id: msg.id,
      p_shop_slug: "demo",
    });

    // 7. Enviar Respuesta a WhatsApp
    if (finalResponse) {
      await sendWhatsAppMessage(finalResponse);

      // Loguear respuesta saliente en bandeja
      const { data: contact } = await supabase
        .from("inbox_contacts")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (contact?.id) {
        void supabase.rpc("handle_outbound_message", {
          p_contact_id: contact.id,
          p_content: extractOutboundText(finalResponse),
        });
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("[AI Bot] Error Crítico:", error);
    // Intentar enviar mensaje de error amigable al usuario
    try {
      const event: YCloudInboundEvent = JSON.parse(rawBody);
      const senderPhone = event.whatsappInboundMessage?.from;
      if (senderPhone) {
        await sendWhatsAppMessage({
          messaging_product: "whatsapp",
          to: senderPhone,
          from: process.env.YCLOUD_DEFAULT_SENDER!,
          type: "text",
          text: { body: "😕 Tuve un problema técnico. Por favor, intentá de nuevo en unos segundos." },
        });
      }
    } catch { /* silenciar error secundario */ }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ── HELPERS DE LÓGICA DE NEGOCIO ─────────────────────────────────────────────

interface SlotRow {
  slot?: string;
  start_time?: string;
  time?: string;
}

async function fetchTimesResponse(
  ctx: ReturnType<typeof runStateMachine>["context"]
): Promise<YCloudOutboundMessage> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_date: ctx.preferredDate,
    p_professional_name: ctx.professional,
    p_shop_slug: "demo",
    p_service_name: ctx.service,
  });

  if (error || !data || (data as SlotRow[]).length === 0) {
    return buildText(ctx.sender, "😕 No hay turnos disponibles para ese día. ¿Probamos otro día?");
  }

  const slots = data as SlotRow[];
  const rows = slots.slice(0, 10).map((s, i) => {
    const raw = s.start_time ?? s.time ?? s.slot ?? "";
    const time = typeof raw === "string" && raw.includes("T")
      ? raw.substring(11, 16)
      : String(raw).substring(0, 5) || `Horario ${i + 1}`;
    return { id: `${time}:00`, title: time, description: "" };
  });

  const [, m, d] = (ctx.preferredDate ?? "").split("-");
  const formattedDate = d && m ? `${d}/${m}` : ctx.preferredDate ?? "";

  return buildList(
    ctx.sender, "🕐 Horarios Disponibles",
    `📅 *${formattedDate}* con *${ctx.professional}*\n\n¿A qué hora te viene bien?`,
    ctx.shopName, "Ver Horarios", "Disponibles", rows
  );
}

interface BookResult {
  success?: boolean;
  error?: string;
  appointment_id?: string;
}

async function bookAndRespond(
  ctx: ReturnType<typeof runStateMachine>["context"],
  phone: string
): Promise<YCloudOutboundMessage> {
  const { data, error } = await supabase.rpc("book_appointment_by_name", {
    p_customer_name: ctx.userName,
    p_customer_phone: phone,
    p_date: ctx.preferredDate,
    p_time: ctx.preferredTime,
    p_professional_name: ctx.professional,
  });

  if (error) {
    return buildText(phone, "❌ Hubo un problema al reservar. Por favor, intentá nuevamente.");
  }

  const result = (Array.isArray(data) ? data[0] : data) as BookResult | null;

  if (result?.success) {
    const [y, m, d] = (ctx.preferredDate ?? "").split("-");
    const formattedDate = `${d}/${m}/${y}`;
    const formattedTime = (ctx.preferredTime ?? "").substring(0, 5);
    return buildText(
      phone,
      `✅ *¡Reserva Confirmada!*\n\n` +
      `💇 *Servicio:* ${ctx.service}\n` +
      `💈 *Profesional:* ${ctx.professional}\n` +
      `📅 *Fecha:* ${formattedDate} a las ${formattedTime}\n\n` +
      `📍 *Lugar:* ${ctx.shopName}\n\n¡Te esperamos! 🎉\n\n` +
      `_Escribí "reservar" para hacer otra reserva._`
    );
  }

  const errorMsg = result?.error ?? "";
  const isDuplicate = errorMsg.includes("idx_unique_active_appointment") || errorMsg.includes("duplicate key");
  return buildText(
    phone,
    isDuplicate
      ? `⚠️ Ya hay un turno en ese horario con ${ctx.professional}.\n\n¿Querés elegir otro horario o día?`
      : `❌ ${errorMsg || "Hubo un problema al reservar."}\n\n¿Probamos otro horario?`
  );
}

interface AppointmentRow {
  appointment_id?: string;
  id?: string;
  appointment_date?: string;
  appointment_time?: string;
  start_time?: string;
  service_name?: string;
}

async function fetchAppointmentsResponse(phone: string, shopName: string): Promise<YCloudOutboundMessage> {
  const { data } = await supabase.rpc("get_client_appointments", { p_phone: phone });
  const appointments = (data ?? []) as AppointmentRow[];

  if (appointments.length === 0) {
    return buildText(phone, "No tenés turnos pendientes. 😊 ¿Querés reservar uno?");
  }

  const rows = appointments.slice(0, 10).map((apt) => {
    const date = apt.appointment_date ?? (apt.start_time ? apt.start_time.substring(0, 10) : "");
    const time = apt.appointment_time ?? (apt.start_time ? apt.start_time.substring(11, 16) : "");
    const [, m, d] = date.split("-");
    const shortDate = d && m ? `${d}/${m}` : date;
    return {
      id: apt.appointment_id ?? apt.id ?? "",
      title: `${shortDate} ${time}`.slice(0, 24),
      description: (apt.service_name ?? "Servicio").slice(0, 72),
    };
  });

  return buildList(phone, "📋 Tus Turnos", "Seleccioná el turno que querés cancelar:", shopName, "Ver Turnos", "Pendientes", rows);
}

interface CancelResult {
  success?: boolean;
}

async function handleCancellation(id: string, phone: string): Promise<YCloudOutboundMessage> {
  const { data } = await supabase.rpc("cancel_appointment", { p_appointment_id: id });
  const result = (Array.isArray(data) ? data[0] : data) as CancelResult | null;
  if (result?.success) return buildText(phone, "✅ Turno cancelado correctamente.");
  return buildText(phone, "❌ No pudimos cancelar el turno. Quizás ya fue cancelado o no existe.");
}

// ── HELPERS AUXILIARES ───────────────────────────────────────────────────────

function extractText(msg: YCloudInboundEvent["whatsappInboundMessage"]): string {
  return (
    msg.interactive?.list_reply?.id ??
    msg.interactive?.button_reply?.id ??
    msg.text?.body ??
    ""
  );
}

function extractOutboundText(msg: YCloudOutboundMessage): string {
  if (msg.type === "text") return msg.text.body;
  return msg.interactive.body.text;
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function getSender(): string {
  const sender = process.env.YCLOUD_DEFAULT_SENDER;
  if (!sender) throw new Error("[YCloud] YCLOUD_DEFAULT_SENDER no configurado.");
  return sender;
}

function buildText(to: string, body: string): YCloudOutboundMessage {
  return {
    messaging_product: "whatsapp",
    to,
    from: getSender(),
    type: "text",
    text: { body },
  };
}

function buildList(
  to: string,
  header: string,
  body: string,
  footer: string,
  button: string,
  section: string,
  rows: Array<{ id: string; title: string; description: string }>
): YCloudOutboundMessage {
  return {
    messaging_product: "whatsapp",
    to,
    from: getSender(),
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header },
      body: { text: body },
      footer: { text: footer },
      action: { button, sections: [{ title: section, rows }] },
    },
  };
}
