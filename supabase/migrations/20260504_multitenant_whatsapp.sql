-- ============================================================
-- Multi-tenant WhatsApp: credenciales por shop, sesiones aisladas
-- ============================================================

-- 1. Agregar columnas de WhatsApp/YCloud a la tabla shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS whatsapp_number       TEXT,
  ADD COLUMN IF NOT EXISTS ycloud_api_key        TEXT,
  ADD COLUMN IF NOT EXISTS ycloud_webhook_secret TEXT;

COMMENT ON COLUMN public.shops.whatsapp_number       IS 'Número de WhatsApp del negocio (ej: +543513149693)';
COMMENT ON COLUMN public.shops.ycloud_api_key        IS 'API Key de la cuenta YCloud del negocio';
COMMENT ON COLUMN public.shops.ycloud_webhook_secret IS 'Webhook secret para verificar firmas HMAC de YCloud';

-- 2. Cargar número de Perro Estudio
UPDATE public.shops
  SET whatsapp_number = '+543513149693'
WHERE slug = 'perro-estudio';

-- 3. Agregar shop_id a booking_sessions (nullable para backward compat con demo)
ALTER TABLE public.booking_sessions
  ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- 4. Índice único parcial: una sesión por (shop, teléfono)
--    Solo aplica cuando shop_id está seteado; no rompe filas legacy del demo.
DROP INDEX IF EXISTS idx_booking_sessions_shop_phone;
CREATE UNIQUE INDEX idx_booking_sessions_shop_phone
  ON public.booking_sessions(shop_id, phone)
  WHERE shop_id IS NOT NULL;

-- ============================================================
-- 5. Funciones RPCs shop-aware (nombres nuevos, no rompen las viejas)
-- ============================================================

-- get_or_create_session_for_shop
DROP FUNCTION IF EXISTS public.get_or_create_session_for_shop(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_or_create_session_for_shop(
  p_phone     TEXT,
  p_shop_slug TEXT
)
RETURNS TABLE (
  phone         TEXT,
  service       TEXT,
  professional  TEXT,
  preferred_date DATE,
  preferred_time TIME,
  current_state  TEXT,
  intent         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shop_id UUID;
  v_session RECORD;
BEGIN
  SELECT id INTO v_shop_id FROM public.shops WHERE slug = p_shop_slug;
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'Shop no encontrado: %', p_shop_slug;
  END IF;

  -- Buscar sesión activa (ventana de 30 min)
  SELECT * INTO v_session
  FROM public.booking_sessions bs
  WHERE bs.shop_id = v_shop_id
    AND bs.phone   = p_phone
    AND bs.updated_at > NOW() - INTERVAL '30 minutes';

  IF v_session IS NULL THEN
    INSERT INTO public.booking_sessions (shop_id, phone, current_state, intent)
    VALUES (v_shop_id, p_phone, 'IDLE', NULL)
    ON CONFLICT (shop_id, phone) WHERE shop_id IS NOT NULL
    DO UPDATE SET updated_at = NOW()
    RETURNING * INTO v_session;
  END IF;

  RETURN QUERY SELECT
    v_session.phone,
    v_session.service,
    v_session.professional,
    v_session.preferred_date,
    v_session.preferred_time,
    v_session.current_state,
    v_session.intent;
END;
$$;

-- update_session_for_shop
DROP FUNCTION IF EXISTS public.update_session_for_shop(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_session_for_shop(
  p_phone          TEXT,
  p_shop_slug      TEXT,
  p_current_state  TEXT DEFAULT NULL,
  p_intent         TEXT DEFAULT NULL,
  p_service        TEXT DEFAULT NULL,
  p_professional   TEXT DEFAULT NULL,
  p_preferred_date TEXT DEFAULT NULL,
  p_preferred_time TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  SELECT id INTO v_shop_id FROM public.shops WHERE slug = p_shop_slug;
  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'Shop no encontrado: %', p_shop_slug;
  END IF;

  INSERT INTO public.booking_sessions
    (shop_id, phone, current_state, intent, service, professional, preferred_date, preferred_time, updated_at)
  VALUES (
    v_shop_id, p_phone,
    COALESCE(p_current_state, 'IDLE'),
    p_intent, p_service, p_professional,
    CASE WHEN p_preferred_date IS NULL OR p_preferred_date = '' THEN NULL ELSE p_preferred_date::DATE END,
    CASE WHEN p_preferred_time IS NULL OR p_preferred_time = '' THEN NULL ELSE p_preferred_time::TIME END,
    NOW()
  )
  ON CONFLICT (shop_id, phone) WHERE shop_id IS NOT NULL
  DO UPDATE SET
    current_state  = COALESCE(EXCLUDED.current_state,  booking_sessions.current_state),
    intent         = EXCLUDED.intent,
    service        = COALESCE(EXCLUDED.service,        booking_sessions.service),
    professional   = COALESCE(EXCLUDED.professional,   booking_sessions.professional),
    preferred_date = COALESCE(EXCLUDED.preferred_date, booking_sessions.preferred_date),
    preferred_time = COALESCE(EXCLUDED.preferred_time, booking_sessions.preferred_time),
    updated_at     = NOW();
END;
$$;

-- reset_session_for_shop
DROP FUNCTION IF EXISTS public.reset_session_for_shop(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.reset_session_for_shop(
  p_phone     TEXT,
  p_shop_slug TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  SELECT id INTO v_shop_id FROM public.shops WHERE slug = p_shop_slug;
  UPDATE public.booking_sessions SET
    service        = NULL,
    professional   = NULL,
    preferred_date = NULL,
    preferred_time = NULL,
    current_state  = 'IDLE',
    intent         = NULL,
    updated_at     = NOW()
  WHERE shop_id = v_shop_id AND phone = p_phone;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_or_create_session_for_shop(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_session_for_shop(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_session_for_shop(TEXT, TEXT) TO service_role;
