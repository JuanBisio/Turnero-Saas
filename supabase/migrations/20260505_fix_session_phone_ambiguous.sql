-- Recrea get_or_create_session_for_shop eliminando 'phone' de RETURNS TABLE.
-- El output parameter 'phone' colisionaba con booking_sessions.phone
-- en el ON CONFLICT, causando "column reference phone is ambiguous".
-- El caller (sessionManager.ts) nunca usó el campo phone del resultado.

DROP FUNCTION IF EXISTS public.get_or_create_session_for_shop(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_or_create_session_for_shop(
  p_phone     TEXT,
  p_shop_slug TEXT
)
RETURNS TABLE (
  current_state  TEXT,
  intent         TEXT,
  service        TEXT,
  professional   TEXT,
  preferred_date DATE,
  preferred_time TIME
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

    IF v_session IS NULL THEN
      SELECT * INTO v_session
      FROM public.booking_sessions
      WHERE shop_id = v_shop_id AND phone = p_phone;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_session.current_state,
    v_session.intent,
    v_session.service,
    v_session.professional,
    v_session.preferred_date,
    v_session.preferred_time;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_session_for_shop(TEXT, TEXT) TO service_role;
