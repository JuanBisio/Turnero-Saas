import { StateMachineInput, StateMachineOutput, WhatsappSession } from "@/types/whatsapp-session";
import { YCloudOutboundMessage } from "@/types/ycloud";
import { buildTextMessage } from "./ycloudClient";

/**
 * Lógica de estados para el flujo de reserva por WhatsApp.
 * Esta es una máquina de estados determinista que decide qué preguntar a continuación.
 */
export function runStateMachine(input: StateMachineInput): StateMachineOutput {
  const { userMessage, userName, sender, shopContext, session, aiResult, todayDate } = input;
  const { services, professionals, shop_name: shopName } = shopContext;
  const msgLower = userMessage.toLowerCase();

  // Valores base de la sesión (empezamos con lo que ya teníamos)
  let intent = session.intent;
  let service = session.service;
  let professional = session.professional;
  let preferredDate = session.preferred_date;
  let preferredTime = session.preferred_time;
  let currentState = session.current_state;

  // 1. GESTIÓN DE PRIORIDADES (Globales)
  // Siempre permitimos volver a empezar o cancelar
  if (msgLower.includes("cancelar") || aiResult.intent === "CANCEL") {
    intent = "CANCEL";
    service = null; professional = null; preferredDate = null; preferredTime = null;
    currentState = "AWAITING_CANCEL_SELECTION";
  } 
  else if (msgLower.includes("reservar") || msgLower.includes("otro turno") || aiResult.intent === "BOOK") {
    intent = "BOOK";
    // Si ya tenía datos pero dice "nueva reserva", borramos para empezar de cero
    if (currentState === "IDLE" || msgLower.includes("nuevo") || msgLower.includes("otra")) {
        service = null; professional = null; preferredDate = null; preferredTime = null;
    }
  }

  // 2. REFINAMIENTO DE DATOS (Matching Directo)
  // El AI puede fallar, pero el matching exacto de palabras de la lista no falla.
  if (intent === "BOOK") {
    // Si la IA extrajo algo, lo tomamos
    if (aiResult.extracted.service) service = aiResult.extracted.service;
    if (aiResult.extracted.professional) professional = aiResult.extracted.professional;
    if (aiResult.extracted.date) preferredDate = aiResult.extracted.date;
    if (aiResult.extracted.time) preferredTime = aiResult.extracted.time;

    // Matches exactos de lista (prioridad sobre la IA)
    for (const s of services) {
        if (userMessage === s || msgLower === s.toLowerCase()) { service = s; break; }
    }
    for (const p of professionals) {
        if (userMessage === p || msgLower === p.toLowerCase()) { professional = p; break; }
    }
    
    // Formato de fecha ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(userMessage)) preferredDate = userMessage;
    // Formato de hora
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(userMessage)) {
        preferredTime = userMessage.length === 5 ? `${userMessage}:00` : userMessage;
    }
  }

  // 3. DETERMINAR RESPUESTA Y PRÓXIMO ESTADO
  let response: YCloudOutboundMessage | null = null;
  let routeTo: 0 | 1 | 2 | 3 = 0; // 0: Msg directo, 1: Fetch Slots, 2: Reservar, 3: Cancelar

  if (intent === "CANCEL") {
    routeTo = 3; // Lógica de cancelación
  } 
  else if (aiResult.intent === "GREET" && currentState === "IDLE") {
    response = buildTextMessage(sender, aiResult.naturalResponse || `¡Hola ${userName}! 👋 Bienvenido a *${shopName}*. ¿En qué te puedo ayudar hoy?`);
    currentState = "IDLE";
  }
  else if (intent === "BOOK") {
    if (!service) {
        response = buildListMessage(sender, "Servicios", aiResult.naturalResponse || "¿Qué servicio buscás hoy? ✂️", shopName, "Ver Servicios", services);
        currentState = "AWAITING_SERVICE";
    } 
    else if (!professional) {
        response = buildListMessage(sender, "Profesionales", aiResult.naturalResponse || `Elegiste *${service}*. ¿Con quién te gustaría atenderte?`, shopName, "Ver Profesionales", professionals);
        currentState = "AWAITING_PROFESSIONAL";
    }
    else if (!preferredDate) {
        response = buildDateListMessage(sender, aiResult.naturalResponse || `¡Genial! ¿Para qué día reservamos?`, shopName, todayDate);
        currentState = "AWAITING_DATE";
    }
    else if (!preferredTime) {
        currentState = "AWAITING_TIME";
        routeTo = 1; // Disparar búsqueda de horarios
    }
    else {
        routeTo = 2; // Disparar confirmación final
    }
  }
  else {
    // Respuesta fallback
    response = buildTextMessage(sender, aiResult.naturalResponse || "¡Hola! 👋 Puedo ayudarte a *reservar* un turno o *cancelar* uno existente. ¿Qué preferís?");
    currentState = "IDLE";
  }

  return {
    routeTo,
    response,
    updatedSession: {
        current_state: currentState,
        intent: intent,
        service: service,
        professional: professional,
        preferred_date: preferredDate,
        preferred_time: preferredTime
    },
    context: { sender, userName, shopName, service, professional, preferredDate: preferredDate, preferredTime: preferredTime }
  };
}

// ── HELPERS DE CONSTRUCCIÓN DE MENSAJES INTERACTIVOS ─────────────────────────

function getSender(): string {
  const s = process.env.YCLOUD_DEFAULT_SENDER;
  if (!s) throw new Error("[YCloud] YCLOUD_DEFAULT_SENDER no configurado.");
  return s;
}

function buildListMessage(to: string, header: string, body: string, footer: string, button: string, items: string[]): YCloudOutboundMessage {
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
      action: {
        button: button,
        sections: [
          {
            title: "Opciones",
            rows: items.slice(0, 10).map(item => ({
              id: item,
              title: item.slice(0, 24),
              description: ""
            }))
          }
        ]
      }
    }
  };
}

function buildDateListMessage(to: string, body: string, footer: string, todayDate: string): YCloudOutboundMessage {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  const today = new Date(todayDate);
  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const label = i === 0 ? "Hoy" : i === 1 ? "Mañana" : days[d.getDay()];
    return {
      id: iso,
      title: `${label} ${d.getDate()}/${d.getMonth() + 1}`,
      description: ""
    };
  });

  return {
    messaging_product: "whatsapp",
    to,
    from: getSender(),
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "Elegí una fecha" },
      body: { text: body },
      footer: { text: footer },
      action: {
        button: "Ver Calendario",
        sections: [{ title: "Próximos 7 días", rows }]
      }
    }
  };
}
