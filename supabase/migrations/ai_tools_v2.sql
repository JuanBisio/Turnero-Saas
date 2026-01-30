-- Function to get available slots, filtering by Professional Name (optional)
-- This makes it easier for the AI: it just passes the name "Juan", and SQL finds the ID.

CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_professional_name TEXT DEFAULT NULL
) 
RETURNS TABLE (slot TIME) 
LANGUAGE plpgsql
AS $$
DECLARE
  r_start TIME := '09:00:00'; 
  r_end   TIME := '18:00:00'; 
  curr    TIME;
  v_professional_id UUID;
BEGIN
  -- If a name is provided, try to find the ID
  IF p_professional_name IS NOT NULL THEN
    SELECT id INTO v_professional_id 
    FROM professionals 
    WHERE name ILIKE '%' || p_professional_name || '%' 
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
      -- Filter by professional ONLY if we found one
      AND (v_professional_id IS NULL OR professional_id = v_professional_id)
    ) THEN
      slot := curr;
      RETURN NEXT;
    END IF;
    curr := curr + INTERVAL '1 hour';
  END LOOP;
END;
$$;
