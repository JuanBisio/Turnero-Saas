-- SMART SLOTS V4
-- Generates slots based on the ACTUAL service duration (e.g. 40 mins) instead of fixed 1 hour.
-- If no service is specified, it picks the first service found for the shop to determine duration.

CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_professional_name TEXT DEFAULT NULL,
  p_shop_slug TEXT DEFAULT 'demo',
  p_service_name TEXT DEFAULT NULL
) 
RETURNS TABLE (slot TIME) 
LANGUAGE plpgsql
AS $$
DECLARE
  r_start TIME := '09:00:00'; 
  r_end   TIME := '21:00:00'; -- Extended hours based on screenshot (lists 21:40)
  curr    TIME;
  v_shop_id UUID;
  v_professional_id UUID;
  v_service_duration INTEGER := 30; -- Default fallback
  v_interval INTERVAL;
BEGIN
  -- 1. Get Shop ID
  SELECT id INTO v_shop_id FROM shops WHERE slug = p_shop_slug LIMIT 1;
  IF v_shop_id IS NULL THEN RETURN; END IF;

  -- 2. Get Professional ID (if name provided)
  IF p_professional_name IS NOT NULL THEN
    SELECT id INTO v_professional_id 
    FROM professionals 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_professional_name || '%' 
    LIMIT 1;
  END IF;

  -- 3. Determine Duration (Key Step!)
  -- If service name provided, look it up.
  -- If NOT provided, pick the FIRST service of the shop (Heuristic).
  IF p_service_name IS NOT NULL THEN
    SELECT duration_minutes INTO v_service_duration
    FROM services 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_service_name || '%' 
    LIMIT 1;
  ELSE
    SELECT duration_minutes INTO v_service_duration
    FROM services 
    WHERE shop_id = v_shop_id 
    LIMIT 1;
  END IF;

  -- Fallback if still null
  v_service_duration := COALESCE(v_service_duration, 40); -- Default to 40 if nothing found (matching screenshot)
  v_interval := (v_service_duration || ' minutes')::interval;

  -- 4. Generate Slots
  curr := r_start;
  WHILE curr + v_interval <= r_end LOOP -- Ensure the service fits before closing
    
    -- Check availability (No Overlaps)
    IF NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.start_time::date = p_date
      AND a.shop_id = v_shop_id
      AND a.status NOT IN ('cancelado', 'no_asistio')
      AND (v_professional_id IS NULL OR a.professional_id = v_professional_id)
      AND (
        -- Overlap Logic:
        -- (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
        (curr < a.end_time::time) AND ((curr + v_interval) > a.start_time::time)
      )
    ) THEN
      slot := curr;
      RETURN NEXT;
    END IF;

    -- Increment by duration (Back-to-back slots)
    curr := curr + v_interval;
  END LOOP;
END;
$$;
