-- =============================================================================
-- Migración: Unificar update_session en booking_sessions con todos los campos
-- Problema: fix_update_session_return.sql apuntaba a whatsapp_sessions y
--           eliminó p_current_state e p_intent. sessionManager.ts necesita
--           los 7 parámetros y usar la misma tabla que get_or_create_session.
-- =============================================================================

-- 1. Eliminar TODAS las versiones previas de update_session (distintas firmas)
DROP FUNCTION IF EXISTS public.update_session(TEXT, TEXT, TEXT, DATE, TIME);
DROP FUNCTION IF EXISTS public.update_session(TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_session(TEXT, TEXT, TEXT, DATE, TEXT);
DROP FUNCTION IF EXISTS public.update_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 2. Crear la versión definitiva apuntando a booking_sessions
--    Acepta todos los parámetros que sessionManager.ts envía.
--    preferred_date y preferred_time son TEXT para evitar errores de casteo
--    cuando el valor es NULL (no se pasa string vacío desde el código).
CREATE OR REPLACE FUNCTION public.update_session(
  p_phone          TEXT,
  p_current_state  TEXT    DEFAULT NULL,
  p_intent         TEXT    DEFAULT NULL,
  p_service        TEXT    DEFAULT NULL,
  p_professional   TEXT    DEFAULT NULL,
  p_preferred_date TEXT    DEFAULT NULL,  -- "YYYY-MM-DD" o NULL
  p_preferred_time TEXT    DEFAULT NULL   -- "HH:MM:SS" o NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert: crea la sesión si no existe, actualiza si existe.
  -- COALESCE preserva el valor anterior cuando el nuevo es NULL.
  INSERT INTO public.booking_sessions
    (phone, current_state, intent, service, professional, preferred_date, preferred_time, updated_at)
  VALUES (
    p_phone,
    COALESCE(p_current_state, 'IDLE'),
    p_intent,
    p_service,
    p_professional,
    CASE WHEN p_preferred_date IS NULL OR p_preferred_date = '' THEN NULL
         ELSE p_preferred_date::DATE END,
    CASE WHEN p_preferred_time IS NULL OR p_preferred_time = '' THEN NULL
         ELSE p_preferred_time::TIME END,
    NOW()
  )
  ON CONFLICT (phone) DO UPDATE SET
    current_state  = COALESCE(EXCLUDED.current_state,  booking_sessions.current_state),
    intent         = EXCLUDED.intent,  -- permite poner NULL explícitamente (reset intención)
    service        = COALESCE(EXCLUDED.service,        booking_sessions.service),
    professional   = COALESCE(EXCLUDED.professional,   booking_sessions.professional),
    preferred_date = COALESCE(EXCLUDED.preferred_date, booking_sessions.preferred_date),
    preferred_time = COALESCE(EXCLUDED.preferred_time, booking_sessions.preferred_time),
    updated_at     = NOW();
END;
$$;

-- 3. Permisos: accesible desde anon (bot usa anon key en algunos casos) y service_role
GRANT EXECUTE ON FUNCTION public.update_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.update_session(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- =============================================================================
-- Verificación manual (opcional, ejecutar en SQL Editor para confirmar):
-- SELECT routine_name, specific_name, data_type
-- FROM information_schema.routines
-- WHERE routine_name = 'update_session'
--   AND routine_schema = 'public';
-- =============================================================================
