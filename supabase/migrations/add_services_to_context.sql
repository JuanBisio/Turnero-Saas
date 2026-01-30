-- ADD SERVICES TO CONTEXT
-- Now the bot knows the "Menu" of services (Corte, Barba, etc.) to ask the right questions.

CREATE OR REPLACE FUNCTION get_shop_context(
  p_slug TEXT DEFAULT 'demo',
  p_phone TEXT DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_shop_id UUID;
  v_shop_name TEXT;
  v_pros TEXT;
  v_services TEXT;
  v_history TEXT := '';
BEGIN
  -- 1. Get Shop Info
  SELECT id, name INTO v_shop_id, v_shop_name FROM shops WHERE slug = p_slug;

  IF v_shop_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Shop not found');
  END IF;

  -- 2. Get Professionals (Active)
  SELECT string_agg(name, ', ') INTO v_pros
  FROM professionals
  WHERE shop_id = v_shop_id
  AND is_active = true;

  -- 3. Get Services (Active - relying on existence)
  -- Lists names like "Corte de Pelo (30m), Barba (20m)"
  SELECT string_agg(name || ' (' || duration_minutes || 'm)', ', ') INTO v_services
  FROM services
  WHERE shop_id = v_shop_id;

  -- 4. Get History (Chronological)
  IF p_phone IS NOT NULL THEN
    SELECT string_agg(line, E'\n') INTO v_history
    FROM (
      SELECT line FROM (
        SELECT 
          created_at,
          CASE 
            WHEN role = 'user' THEN 'Cliente: ' || message
            ELSE 'Asistente: ' || message
          END as line
        FROM chat_history 
        WHERE sender_phone = p_phone 
        ORDER BY created_at DESC 
        LIMIT 10 
      ) recent_msgs
      ORDER BY created_at ASC 
    ) final_msgs;
  END IF;

  -- 5. Return Combined JSON
  RETURN jsonb_build_object(
    'shop_name', v_shop_name,
    'professionals', COALESCE(v_pros, 'Cualquiera'),
    'services', COALESCE(v_services, 'Consulta por privado'),
    'history', COALESCE(v_history, 'Sin historial previo.')
  );
END;
$$;
