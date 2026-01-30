-- FIX ORDER SCRIPT
-- Corrects the chat history order (Oldest -> Newest) so the AI reads it naturally.

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
  v_history TEXT := '';
BEGIN
  -- 1. Get Shop Info
  SELECT id, name INTO v_shop_id, v_shop_name FROM shops WHERE slug = p_slug;

  IF v_shop_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Shop not found');
  END IF;

  -- 2. Get Professionals
  SELECT string_agg(name, ', ') INTO v_pros
  FROM professionals
  WHERE shop_id = v_shop_id
  AND is_active = true;

  -- 3. Get History (Corrected: Chronological Order)
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
        LIMIT 10 -- Get last 10
      ) recent_msgs
      ORDER BY created_at ASC -- Re-order Oldest -> Newest for reading
    ) final_msgs;
  END IF;

  -- 4. Return Combined JSON
  RETURN jsonb_build_object(
    'shop_name', v_shop_name,
    'professionals', COALESCE(v_pros, 'Cualquiera'),
    'history', COALESCE(v_history, 'Sin historial previo.')
  );
END;
$$;
