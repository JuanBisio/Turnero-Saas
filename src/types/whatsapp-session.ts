import { YCloudOutboundMessage } from "./ycloud";

export type SessionState =
  | "IDLE"
  | "AWAITING_SERVICE"
  | "AWAITING_PROFESSIONAL"
  | "AWAITING_DATE"
  | "AWAITING_TIME"
  | "AWAITING_CANCEL_SELECTION";

export type SessionIntent = "BOOK" | "CANCEL" | "GREET" | "INFO" | "OTHER" | null;

export interface WhatsappSession {
  current_state: SessionState;
  intent: SessionIntent;
  service: string | null;
  professional: string | null;
  preferred_date: string | null;        // "YYYY-MM-DD"
  preferred_time: string | null;        // "HH:MM:SS"
}

export interface ShopContext {
  shop_name: string;
  services: string[];                   // ya spliteados del string "s1,s2,s3"
  professionals: string[];
  sender_phone: string;                 // shop_sender para YCloud
}

export interface AIInterpreterResult {
  intent: "BOOK" | "CANCEL" | "INFO" | "GREET" | "OTHER";
  extracted: {
    service: string | null;
    professional: string | null;
    date: string | null;               // "YYYY-MM-DD"
    time: string | null;               // "HH:MM:SS"
  };
  naturalResponse: string;
}

export interface StateMachineInput {
  userMessage: string;
  userName: string;
  sender: string;
  shopContext: ShopContext;
  session: WhatsappSession;
  aiResult: AIInterpreterResult;
  todayDate: string;                   // "YYYY-MM-DD"
}

export interface StateMachineOutput {
  routeTo: 0 | 1 | 2 | 3;
  // 0 = respuesta directa | 1 = fetch horarios | 2 = confirmar reserva | 3 = cancelar
  response: YCloudOutboundMessage | null;
  updatedSession: WhatsappSession;
  context: {
    sender: string;
    userName: string;
    shopName: string;
    service: string | null;
    professional: string | null;
    preferredDate: string | null;
    preferredTime: string | null;
  };
}
