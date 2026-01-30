-- Function to Book Appointment using NAMES (easier for AI)
-- It automatically finds the IDs for the shop ('demo') and the professional 'Juan'.

CREATE OR REPLACE FUNCTION book_appointment_by_name(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_date DATE,
  p_time TIME,
  p_professional_name TEXT DEFAULT NULL,
  p_shop_slug TEXT DEFAULT 'demo'
) 
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_shop_id UUID;
  v_prof_id UUID;
  v_appt_id UUID;
  v_start_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1. Get Shop ID
  SELECT id INTO v_shop_id FROM shops WHERE slug = p_shop_slug LIMIT 1;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'Shop demo not found'; END IF;

  -- 2. Get Professional ID (if provided)
  IF p_professional_name IS NOT NULL THEN
    SELECT id INTO v_prof_id 
    FROM professionals 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_professional_name || '%' 
    LIMIT 1;
    
    IF v_prof_id IS NULL THEN RAISE EXCEPTION 'Professional not found'; END IF;
  ELSE
    -- Optional: If no pro provided, pick any or leave null? 
    -- Let's pick the first one for simplicity in this demo
    SELECT id INTO v_prof_id FROM professionals WHERE shop_id = v_shop_id LIMIT 1;
  END IF;

  -- 3. Construct Timestamp
  v_start_ts := (p_date || ' ' || p_time)::timestamp with time zone;

  -- 4. Insert Appointment
  INSERT INTO appointments (
    shop_id, 
    professional_id, 
    customer_name, 
    customer_phone, 
    start_time, 
    end_time,
    status
  ) VALUES (
    v_shop_id,
    v_prof_id,
    p_customer_name,
    p_customer_phone,
    v_start_ts,
    v_start_ts + INTERVAL '1 hour', -- Default 1h duration
    'pendiente'
  ) RETURNING id INTO v_appt_id;

  RETURN jsonb_build_object('appointment_id', v_appt_id, 'status', 'confirmed', 'professional', p_professional_name);
END;
$$;
