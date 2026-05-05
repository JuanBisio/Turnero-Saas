// ── Inbound (YCloud → nuestro servidor) ──────────────────────────────────────

export interface YCloudInboundEvent {
  id: string;
  type: "whatsapp.inbound_message.received";
  apiVersion: "v2";
  createTime: string;
  whatsappInboundMessage: YCloudInboundMessage;
}

export interface YCloudInboundMessage {
  id: string;
  wamid: string;
  wabaId: string;
  from: string;                              // "+5493584014857"
  to: string;
  sendTime: string;
  type: "text" | "interactive" | "image" | "audio" | "document";
  text?: { body: string };
  interactive?: {
    type: "list_reply" | "button_reply";
    list_reply?: { id: string; title: string };
    button_reply?: { id: string; title: string };
  };
  customerProfile?: { name: string };
}

// ── Outbound (nuestro servidor → YCloud) ─────────────────────────────────────

export interface YCloudTextMessage {
  messaging_product: "whatsapp";
  to: string;
  from: string;
  type: "text";
  text: { body: string };
}

export interface YCloudInteractiveMessage {
  messaging_product: "whatsapp";
  to: string;
  from: string;
  type: "interactive";
  interactive: YCloudInteractivePayload;
}

export type YCloudInteractivePayload =
  | YCloudListMessage
  | YCloudButtonMessage;

export interface YCloudListMessage {
  type: "list";
  header: { type: "text"; text: string };
  body: { text: string };
  footer: { text: string };
  action: {
    button: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description: string }>;
    }>;
  };
}

export interface YCloudButtonMessage {
  type: "button";
  body: { text: string };
  action: {
    buttons: Array<{ type: "reply"; reply: { id: string; title: string } }>;
  };
}

// Template messages (para confirmaciones de turno)
export interface YCloudTemplateRequest {
  to: string;
  template_name: string;
  parameters: Record<string, string>;
  from?: string;
}

export interface YCloudTemplateResponse {
  id: string;
  status: "submitted" | "sent" | "failed";
  error?: {
    code: string;
    message: string;
  };
}

export interface AppointmentNotificationPayload {
  appointmentId: string;
  clientPhone: string;
  clientName: string;
  datetime: string;
  serviceName: string;
  professionalName: string;
  shopName: string;       // {{2}} "Tu turno en {{2}}"
  shopLocation?: string;  // {{7}} Ubicación; fallback a shopName si no está
  shopSender?: string;    // Número WhatsApp del negocio (from)
  shopApiKey?: string;    // API Key de YCloud del negocio
}

export type YCloudOutboundMessage = 
  | YCloudTextMessage 
  | YCloudInteractiveMessage;
