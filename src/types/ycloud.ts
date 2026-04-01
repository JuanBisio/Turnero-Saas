/**
 * Contratos de la API de YCloud para el envío de mensajes de WhatsApp.
 * Referencia: https://docs.ycloud.com/reference/whatsapp-messages
 */

/**
 * Cuerpo del request enviado a YCloud para un mensaje de template.
 * El template `confirmacion_turno` requiere exactamente los 5 parámetros definidos.
 */
export interface YCloudTemplateRequest {
  /** Número destino en formato internacional: "5491XXXXXXXXX" (sin + ni espacios) */
  to: string;
  /** Nombre del template aprobado en YCloud */
  template_name: 'confirmacion_turno';
  /** Parámetros posicionales del cuerpo del template */
  parameters: {
    p1_name: string;    // Nombre del cliente
    p2_date: string;    // Fecha formateada: "DD/MM/YYYY"
    p3_time: string;    // Hora formateada: "HH:mm"
    p4_service: string; // Nombre del servicio
    p5_prof: string;    // Nombre del profesional
  };
  /** Número remitente verificado en YCloud. Si no se provee, usa YCLOUD_DEFAULT_SENDER. */
  from?: string;
}

/**
 * Respuesta de la API de YCloud tras enviar un mensaje.
 */
export interface YCloudTemplateResponse {
  /** ID único del mensaje asignado por YCloud */
  id: string;
  /** Estado del mensaje al momento de la respuesta */
  status: 'submitted' | 'sent' | 'failed';
  /** Presente solo cuando status === 'failed' */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Payload interno que fluye entre capas de la aplicación.
 * Este tipo es la única interfaz pública del módulo de notificaciones.
 */
export interface AppointmentNotificationPayload {
  /** ID del turno — usado para logging y trazabilidad */
  appointmentId: string;
  /** Nombre completo del cliente */
  clientName: string;
  /** Teléfono del cliente (cualquier formato argentino válido) */
  clientPhone: string;
  /** Nombre del servicio agendado */
  serviceName: string;
  /** Nombre del profesional asignado */
  professionalName: string;
  /**
   * Fecha y hora del turno en ISO 8601.
   * Ejemplo: "2025-01-15T14:30:00"
   */
  datetime: string;
  /**
   * Override del número remitente para este envío.
   * Si no se provee, se usa YCLOUD_DEFAULT_SENDER.
   */
  shopSender?: string;
}
