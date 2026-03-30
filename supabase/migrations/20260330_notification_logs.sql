-- Migración: tabla de auditoría para notificaciones de WhatsApp
-- Proyecto: turnero-saas
-- Fecha: 2026-03-30
-- Paso 7 del plan de integración YCloud

-- Tabla principal de logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id TEXT        NOT NULL,
  channel        TEXT        NOT NULL DEFAULT 'whatsapp',
  status         TEXT        NOT NULL CHECK (status IN ('success', 'failed', 'retry_pending')),
  error_message  TEXT,
  sent_at        TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para buscar logs por turno (ej: ver historial de un appointment)
CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment
  ON notification_logs(appointment_id);

-- Índice compuesto para queries de monitoreo por status y tiempo
CREATE INDEX IF NOT EXISTS idx_notification_logs_status_time
  ON notification_logs(status, sent_at DESC);

-- RLS: habilitar Row Level Security
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Política: solo el service role puede insertar logs (notificationService.ts usa service_role key)
CREATE POLICY "service_role_insert_notification_logs"
  ON notification_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política: solo el service role puede leer logs (para auditoría interna)
CREATE POLICY "service_role_select_notification_logs"
  ON notification_logs
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================================
-- Queries útiles de monitoreo (ejecutar en el SQL Editor)
-- ============================================================

-- Ver últimas 50 notificaciones con errores (últimas 24hs)
-- SELECT appointment_id, status, error_message, sent_at
-- FROM notification_logs
-- WHERE channel = 'whatsapp'
--   AND created_at > now() - interval '24 hours'
-- ORDER BY sent_at DESC
-- LIMIT 50;

-- Tasa de éxito por hora
-- SELECT
--   date_trunc('hour', sent_at) AS hora,
--   COUNT(*) FILTER (WHERE status = 'success') AS exitosos,
--   COUNT(*) FILTER (WHERE status = 'failed')  AS fallidos,
--   ROUND(
--     COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*) * 100, 1
--   ) AS tasa_exito_pct
-- FROM notification_logs
-- WHERE channel = 'whatsapp'
-- GROUP BY 1
-- ORDER BY 1 DESC;
