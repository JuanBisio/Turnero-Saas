-- Function to get available slots for a professional on a given date
-- Updated: Uses start_time instead of non-existent appointment_date column
CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_shop_id UUID DEFAULT NULL 
) 
RETURNS TABLE (slot TIME) 
LANGUAGE plpgsql
AS $$
DECLARE
  r_start TIME := '09:00:00'; -- Default start time
  r_end   TIME := '18:00:00'; -- Default end time
  curr    TIME;
BEGIN
  -- We assume 30 minutes slots for simplicity, you can make this dynamic later
  curr := r_start;
  
  WHILE curr < r_end LOOP
    -- Check if there is an appointment interacting with this slot
    -- We assume if an appointment starts at X, the slot X is taken.
    IF NOT EXISTS (
      SELECT 1 FROM appointments 
      WHERE start_time::date = p_date  -- Corrected column
      AND start_time::time = curr      -- Simple match
      AND status NOT IN ('cancelado')
    ) THEN
      slot := curr;
      RETURN NEXT;
    END IF;
    
    curr := curr + INTERVAL '1 hour'; -- Assuming 1 hour slots for haircuts
  END LOOP;
END;
$$;
