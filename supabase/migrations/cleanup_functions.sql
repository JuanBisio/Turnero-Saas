-- 🚨 CLEANUP SCRIPT 🚨
-- This removes the confusion between different versions of the function.

-- 1. Drop ALL versions of get_available_slots to start fresh
DROP FUNCTION IF EXISTS get_available_slots(date, uuid);
DROP FUNCTION IF EXISTS get_available_slots(date, text);
DROP FUNCTION IF EXISTS get_available_slots(date, text, text);

-- 2. Refine the ONE TRUE FUNCTION (SaaS Ready)
CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_professional_name TEXT DEFAULT NULL,
  p_shop_slug TEXT DEFAULT 'demo'
) 
RETURNS TABLE (slot TIME) 
LANGUAGE plpgsql
AS $$
DECLARE
  r_start TIME := '09:00:00'; 
  r_end   TIME := '18:00:00'; 
  curr    TIME;
  v_shop_id UUID;
  v_professional_id UUID;
BEGIN
  -- Get Shop
  SELECT id INTO v_shop_id FROM shops WHERE slug = p_shop_slug LIMIT 1;
  IF v_shop_id IS NULL THEN RETURN; END IF;

  -- Get Professional (if provided)
  IF p_professional_name IS NOT NULL AND p_professional_name != '' THEN
    SELECT id INTO v_professional_id 
    FROM professionals 
    WHERE shop_id = v_shop_id
    AND name ILIKE '%' || p_professional_name || '%' 
    LIMIT 1;
  END IF;

  curr := r_start;
  WHILE curr < r_end LOOP
    IF NOT EXISTS (
      SELECT 1 FROM appointments 
      WHERE start_time::date = p_date 
      AND start_time::time = curr
      AND status NOT IN ('cancelado')
      AND shop_id = v_shop_id 
      AND (v_professional_id IS NULL OR professional_id = v_professional_id)
    ) THEN
      slot := curr;
      RETURN NEXT;
    END IF;
    curr := curr + INTERVAL '1 hour';
  END LOOP;
END;
$$;
