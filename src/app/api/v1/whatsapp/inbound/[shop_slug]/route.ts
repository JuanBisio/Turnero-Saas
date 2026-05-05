import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyYCloudSignature } from "@/lib/whatsapp/signatureVerifier";
import {
  getOrCreateSessionForShop,
  updateSessionForShop,
  resetSessionForShop,
} from "@/lib/whatsapp/sessionManager";
import { getShopContext } from "@/lib/whatsapp/shopContext";
import { interpretMessage } from "@/lib/whatsapp/aiInterpreter";
import { runStateMachine } from "@/lib/whatsapp/stateMachine";
import { sendWhatsAppMessage } from "@/lib/whatsapp/ycloudClient";
import { YCloudInboundEvent, YCloudOutboundMessage } from "@/types/ycloud";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  return createClient(supabaseUrl, supabaseKey);
}

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  whatsapp_number: string | null;
  ycloud_api_key: string | null;
  ycloud_webhook_secret: string | null;
}

async function loadShop(slug: string): Promise<ShopRow | null> {
  const { data, error } = await getAdminClient()
    .from("shops")
    .select("id, name, slug, whatsapp_number, ycloud_api_key, ycloud_webhook_secret")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(`[Shop] Error cargando ${slug}:`, error.message);
    return null;
  }
  return data;
}

/**
 * Bot de IA multi-tenant.
 * URL: POST /api/v1/whatsapp/inbound/[shop_slug]
 * Cada negocio configura este endpoint en su cuenta de YCloud.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shop_slug: string }> }
): Promise<NextResponse> {
  const { shop_slug } = await params;
  const rawBody = await request.text();
  const signature = request.headers.get("ycloud-signature") ?? "";

  // 1. Cargar credenciales del shop desde DB
  const shop = await loadShop(shop_slug);
  if (!shop) {
    console.warn(`[Bot] Shop no encontrado: ${shop_slug}`);
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Número remitente del negocio (WhatsApp del shop, no del cliente)
  const senderPhone = shop.whatsapp_number ?? process.env.YCLOUD_DEFAULT_SENDER!;
  const shopApiKey = shop.ycloud_api_key ?? undefined;

  try {
    // 2. Validar firma HMAC con el secret del shop
    const secret = shop.ycloud_webhook_secret ?? process.env.YCLOUD_WEBHOOK_SECRET ?? "";
    if (!verifyYCloudSignature(rawBody, signature, secret)) {
      console.warn(`[Bot:${shop_slug}] Firma inválida`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event: YCloudInboundEvent = JSON.parse(rawBody);
    if (!event.whatsappInboundMessage) return NextResponse.json({ ok: true });

    const msg = event.whatsappInboundMessage;
    const phone = msg.from;
    const userText = msg.text?.body ?? extractText(msg);
    const userName = msg.customerProfile?.name ?? "Cliente";

    // 3. Cargar sesión y contexto del negocio en paralelo
    const [session, shopCtx] = await Promise.all([
      getOrCreateSessionForShop(phone, shop_slug),
      getShopContext(shop_slug, phone),
    ]);

    const todayDate = new Date().toISOString().split("T")[0];

    // 4. IA: interpretar intención del mensaje
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

    // 5. Máquina de estados
    const machine = runStateMachine({
      userMessage: userText,
      userName,
      sender: phone,
      shopContext: { ...shopCtx, sender_phone: senderPhone },
      session,
      aiResult,
      todayDate,
    });

    // El stateMachine construye la respuesta con el sender del env.
    // Reemplazamos el `from` con el número real del shop.
    let finalResponse: YCloudOutboundMessage | null = patchSender(machine.response, senderPhone);

    // 6. Ejecutar acción según routeTo
    if (session.current_state === "AWAITING_CANCEL_SELECTION" && isUUID(userText)) {
      finalResponse = await handleCancellation(userText, phone, senderPhone);
      await resetSessionForShop(phone, shop_slug);
    } else if (machine.routeTo === 1) {
      finalResponse = await fetchTimesResponse(machine.context, shop_slug, senderPhone);
      await updateSessionForShop(phone, shop_slug, machine.updatedSession);
    } else if (machine.routeTo === 2) {
      finalResponse = await bookAndRespond(machine.context, phone, shop_slug, senderPhone);
      await resetSessionForShop(phone, shop_slug);
    } else if (machine.routeTo === 3) {
      finalResponse = await fetchAppointmentsResponse(phone, shopCtx.shop_name, senderPhone);
      await updateSessionForShop(phone, shop_slug, machine.updatedSession);
    } else {
      await updateSessionForShop(phone, shop_slug, machine.updatedSession);
    }

    // 7. Loguear mensaje entrante en bandeja
    const supabase = getAdminClient();
    await supabase.rpc("handle_inbound_message", {
      p_phone: phone,
      p_name: userName,
      p_content: userText,
      p_y_id: msg.id,
      p_shop_slug: shop_slug,
    });

    // 8. Enviar respuesta y loguear saliente
    if (finalResponse) {
      await sendWhatsAppMessage(finalResponse, shopApiKey);

      const { data: contact } = await supabase
        .from("inbox_contacts")
        .select("id")
        .eq("phone", phone)
        .eq("shop_id", shop.id)
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
    console.error(`[Bot:${shop_slug}] Error crítico:`, error);

    // Intentar enviar mensaje de error al cliente
    try {
      const event: YCloudInboundEvent = JSON.parse(rawBody);
      const customerPhone = event.whatsappInboundMessage?.from;
      if (customerPhone) {
        await sendWhatsAppMessage(
          {
            messaging_product: "whatsapp",
            to: customerPhone,
            from: senderPhone,
            type: "text",
            text: { body: "😕 Tuve un problema técnico. Por favor, intentá de nuevo en unos segundos." },
          },
          shopApiKey
        );
      }
    } catch { /* silenciar error secundario */ }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ── Helpers de lógica de negocio ─────────────────────────────────────────────

interface SlotRow {
  slot?: string;
  start_time?: string;
  time?: string;
}

async function fetchTimesResponse(
  ctx: ReturnType<typeof runStateMachine>["context"],
  shopSlug: string,
  senderPhone: string
): Promise<YCloudOutboundMessage> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_date: ctx.preferredDate,
    p_professional_name: ctx.professional,
    p_shop_slug: shopSlug,
    p_service_name: ctx.service,
  });

  if (error || !data || (data as SlotRow[]).length === 0) {
    return buildText(ctx.sender, senderPhone, "😕 No hay turnos disponibles para ese día. ¿Probamos otro día?");
  }

  const slots = data as SlotRow[];
  const rows = slots.slice(0, 10).map((s, i) => {
    const raw = s.start_time ?? s.time ?? s.slot ?? "";
    const time =
      typeof raw === "string" && raw.includes("T")
        ? raw.substring(11, 16)
        : String(raw).substring(0, 5) || `Horario ${i + 1}`;
    return { id: `${time}:00`, title: time, description: "" };
  });

  const [, m, d] = (ctx.preferredDate ?? "").split("-");
  const formattedDate = d && m ? `${d}/${m}` : ctx.preferredDate ?? "";

  return buildList(
    ctx.sender, senderPhone,
    "🕐 Horarios Disponibles",
    `📅 *${formattedDate}* con *${ctx.professional}*\n\n¿A qué hora te viene bien?`,
    ctx.shopName, "Ver Horarios", "Disponibles", rows
  );
}

interface BookResult {
  success?: boolean;
  error?: string;
}

async function bookAndRespond(
  ctx: ReturnType<typeof runStateMachine>["context"],
  phone: string,
  shopSlug: string,
  senderPhone: string
): Promise<YCloudOutboundMessage> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("book_appointment_by_name", {
    p_customer_name: ctx.userName,
    p_customer_phone: phone,
    p_date: ctx.preferredDate,
    p_time: ctx.preferredTime,
    p_professional_name: ctx.professional,
    p_shop_slug: shopSlug,
  });

  if (error) {
    return buildText(phone, senderPhone, "❌ Hubo un problema al reservar. Por favor, intentá nuevamente.");
  }

  const result = (Array.isArray(data) ? data[0] : data) as BookResult | null;

  if (result?.success) {
    const [y, m, d] = (ctx.preferredDate ?? "").split("-");
    const formattedDate = `${d}/${m}/${y}`;
    const formattedTime = (ctx.preferredTime ?? "").substring(0, 5);
    return buildText(
      phone, senderPhone,
      `✅ *¡Reserva Confirmada!*\n\n` +
        `💇 *Servicio:* ${ctx.service}\n` +
        `💈 *Profesional:* ${ctx.professional}\n` +
        `📅 *Fecha:* ${formattedDate} a las ${formattedTime}\n\n` +
        `📍 *Lugar:* ${ctx.shopName}\n\n¡Te esperamos! 🎉\n\n` +
        `_Escribí "reservar" para hacer otra reserva._`
    );
  }

  const errorMsg = result?.error ?? "";
  const isDuplicate =
    errorMsg.includes("idx_unique_active_appointment") || errorMsg.includes("duplicate key");
  return buildText(
    phone, senderPhone,
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

async function fetchAppointmentsResponse(
  phone: string,
  shopName: string,
  senderPhone: string
): Promise<YCloudOutboundMessage> {
  const supabase = getAdminClient();
  const { data } = await supabase.rpc("get_client_appointments", {
    p_phone: phone,
  });
  const appointments = (data ?? []) as AppointmentRow[];

  if (appointments.length === 0) {
    return buildText(phone, senderPhone, "No tenés turnos pendientes. 😊 ¿Querés reservar uno?");
  }

  const rows = appointments.slice(0, 10).map((apt) => {
    const date =
      apt.appointment_date ?? (apt.start_time ? apt.start_time.substring(0, 10) : "");
    const time =
      apt.appointment_time ?? (apt.start_time ? apt.start_time.substring(11, 16) : "");
    const [, m, d] = date.split("-");
    const shortDate = d && m ? `${d}/${m}` : date;
    return {
      id: apt.appointment_id ?? apt.id ?? "",
      title: `${shortDate} ${time}`.slice(0, 24),
      description: (apt.service_name ?? "Servicio").slice(0, 72),
    };
  });

  return buildList(
    phone, senderPhone,
    "📋 Tus Turnos",
    "Seleccioná el turno que querés cancelar:",
    shopName, "Ver Turnos", "Pendientes", rows
  );
}

interface CancelResult {
  success?: boolean;
}

async function handleCancellation(
  id: string,
  phone: string,
  senderPhone: string
): Promise<YCloudOutboundMessage> {
  const supabase = getAdminClient();
  const { data } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: id,
  });
  const result = (Array.isArray(data) ? data[0] : data) as CancelResult | null;
  if (result?.success) return buildText(phone, senderPhone, "✅ Turno cancelado correctamente.");
  return buildText(phone, senderPhone, "❌ No pudimos cancelar el turno. Quizás ya fue cancelado o no existe.");
}

// ── Helpers auxiliares ───────────────────────────────────────────────────────

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

/** Reemplaza el campo `from` en el mensaje con el número real del shop. */
function patchSender(
  msg: YCloudOutboundMessage | null,
  senderPhone: string
): YCloudOutboundMessage | null {
  if (!msg) return null;
  return { ...msg, from: senderPhone };
}

function buildText(to: string, from: string, body: string): YCloudOutboundMessage {
  return {
    messaging_product: "whatsapp",
    to,
    from,
    type: "text",
    text: { body },
  };
}

function buildList(
  to: string,
  from: string,
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
    from,
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
