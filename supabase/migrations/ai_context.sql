-- Function to get Shop Context (Name + Professionals) for the AI
-- This allows the AI to know who works there without hardcoding names.

CREATE OR REPLACE FUNCTION get_shop_context(
  p_slug TEXT DEFAULT 'demo'
) 
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_shop_id UUID;
  v_shop_name TEXT;
  v_pros TEXT;
BEGIN
  -- 1. Get Shop Info
  SELECT id, name INTO v_shop_id, v_shop_name 
  FROM shops 
  WHERE slug = p_slug;

  IF v_shop_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Shop not found');
  END IF;

  -- 2. Get Comma-Separated Professionals
  SELECT string_agg(name, ', ') INTO v_pros
  FROM professionals
  WHERE shop_id = v_shop_id
  AND is_active = true;

  -- 3. Return JSON
  RETURN jsonb_build_object(
    'shop_name', v_shop_name,
    'professionals', COALESCE(v_pros, 'Cualquiera')
  );
END;
$$;
