-- Migración: schema para el flujo de Cancelación y Multa
-- Proyecto: turnero-saas
-- Fecha: 2026-08-27
-- Ref: Requerimientos Técnicos — Flujo de Cancelación y Multa v1.0

-- ============================================================
-- 1. Quién canceló y por qué (appointments)
-- ============================================================
-- Hoy 'cancelledBy' solo viaja en el payload del webhook (ver webhookUtils.ts),
-- nunca se persiste. Sin esto no se puede aplicar la regla del PDF:
-- "si el cancelador es el peluquero, el cobro de penalización no se activa nunca".
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('customer', 'admin')),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.cancelled_by IS 'Quién disparó la cancelación: customer (link público) o admin (panel del peluquero)';
COMMENT ON COLUMN public.appointments.cancellation_reason IS 'Motivo opcional cargado por el peluquero al cancelar desde el panel';
COMMENT ON COLUMN public.appointments.cancelled_at IS 'Momento exacto de la cancelación, usado para calcular la ventana de anticipación';

-- ============================================================
-- 2. Parámetros de penalización por negocio (shops)
-- ============================================================
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS penalty_percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS free_cancellation_window_hours INTEGER NOT NULL DEFAULT 24
    CHECK (free_cancellation_window_hours IN (2, 6, 12, 24));

COMMENT ON COLUMN public.shops.penalty_percentage IS '% del precio del servicio que se cobra por cancelación tardía o no-show. Default 50% según v1.0 del PDF de requerimientos.';
COMMENT ON COLUMN public.shops.free_cancellation_window_hours IS 'Horas de anticipación a partir de las cuales cancelar no tiene costo. Opciones fijas: 24/12/6/2.';

-- ============================================================
-- 3. Credenciales de Mercado Pago por negocio
-- ============================================================
-- Mismo patrón multi-tenant que ycloud_api_key (ver 20260504_multitenant_whatsapp.sql).
-- NOTA DE SEGURIDAD: se guarda como TEXT plano, igual que ycloud_api_key hoy.
-- Antes de ir a producción con pagos reales, evaluar encriptación a nivel de
-- aplicación o Supabase Vault: el riesgo acá es mayor porque compromete una
-- cuenta de cobro real del peluquero, no solo el envío de WhatsApp.
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS mp_access_token TEXT,
  ADD COLUMN IF NOT EXISTS mp_user_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_connected_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shops.mp_access_token IS 'Access token de la cuenta de Mercado Pago del negocio (OAuth), usado para crear preferencias de pago de la multa';
COMMENT ON COLUMN public.shops.mp_user_id IS 'User ID de Mercado Pago del negocio conectado';
COMMENT ON COLUMN public.shops.mp_connected_at IS 'Momento en que el peluquero conectó su cuenta de Mercado Pago';

-- ============================================================
-- 4. Tabla de multas y su estado de pago
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointment_penalties (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id              UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  shop_id                     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  penalty_percentage_applied NUMERIC(5,2) NOT NULL,
  penalty_amount              NUMERIC(10,2) NOT NULL,

  payment_status    TEXT NOT NULL DEFAULT 'pendiente_pago'
                     CHECK (payment_status IN ('pendiente_pago', 'pagado', 'no_abonado')),
  payment_link      TEXT,
  mp_preference_id  TEXT,

  reminders_sent    INTEGER NOT NULL DEFAULT 0,
  last_reminder_at  TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un turno no puede tener más de un registro de multa activo
  UNIQUE (appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_penalties_shop
  ON public.appointment_penalties(shop_id);

CREATE INDEX IF NOT EXISTS idx_appointment_penalties_pending_reminders
  ON public.appointment_penalties(payment_status, last_reminder_at)
  WHERE payment_status = 'pendiente_pago';

COMMENT ON TABLE public.appointment_penalties IS 'Multa por cancelación tardía o no-show. Un registro por turno cancelado con penalización activada.';
COMMENT ON COLUMN public.appointment_penalties.payment_status IS 'pendiente_pago: link enviado, esperando confirmación manual. pagado: el peluquero confirmó el cobro. no_abonado: se cumplió el ciclo de 3 recordatorios sin pago.';

-- RLS: mismo patrón que notification_logs (20260330_notification_logs.sql) —
-- solo accedida por endpoints con service_role (panel admin, job de
-- recordatorios), nunca directamente por el widget público.
ALTER TABLE public.appointment_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_appointment_penalties"
  ON public.appointment_penalties
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5. Servicio obligatorio en cada turno
-- ============================================================
-- Implementa la decisión de producto: se obliga a elegir servicio al
-- reservar, así el cálculo de multa nunca queda ambiguo (sección 4 del PDF
-- de requerimientos, "dato faltante" pendiente de resolución).
--
-- IMPORTANTE: correr esto ANTES de descomentar el NOT NULL de abajo. Si
-- devuelve filas, resolverlas a mano (asignarles un servicio, o dejarlas
-- si ya están canceladas/completadas y no importa el dato histórico):
--
--   SELECT id, shop_id, customer_name, start_time, status
--   FROM public.appointments
--   WHERE service_id IS NULL;
--
-- Queda comentado a propósito para no romper el deploy si hay turnos
-- legacy sin servicio. Descomentar recién después de verificar lo de arriba.

-- ALTER TABLE public.appointments
--   ALTER COLUMN service_id SET NOT NULL;
