-- Function to get available slots, filtering by Shop (slug) and Professional Name
-- Default Shop Slug is set to 'demo' for your case.

CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_professional_name TEXT DEFAULT NULL,
  p_shop_slug TEXT DEFAULT 'demo' -- Hardcoded default to 'demo'
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
  -- 1. Get Shop ID from Slug
  SELECT id INTO v_shop_id FROM shops WHERE slug = p_shop_slug LIMIT 1;
  
  -- If shop not found, return empty
  IF v_shop_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Get Professional ID (if name provided)
  IF p_professional_name IS NOT NULL THEN
    SELECT id INTO v_professional_id 
    FROM professionals 
    WHERE shop_id = v_shop_id
    AND name ILIKE '%' || p_professional_name || '%' 
    LIMIT 1;
  END IF;

  curr := r_start;
  WHILE curr < r_end LOOP
    -- Check availability
    IF NOT EXISTS (
      SELECT 1 FROM appointments 
      WHERE start_time::date = p_date 
      AND start_time::time = curr
      AND status NOT IN ('cancelado')
      AND shop_id = v_shop_id -- Filter by correct shop
      -- Filter by professional if we found one, otherwise show all available spots in shop??
      -- Usually if no professional specified, we check if *any* professional is free?
      -- For simplicity: If professional is NULL, we assume we check ANY generic availability 
      -- (or you can force the AI to always ask for a name).
      -- Here we filter by professional ONLY if v_professional_id is found.
      AND (v_professional_id IS NULL OR professional_id = v_professional_id)
    ) THEN
      slot := curr;
      RETURN NEXT;
    END IF;
    curr := curr + INTERVAL '1 hour';
  END LOOP;
END;
$$;
