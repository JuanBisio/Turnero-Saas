-- Drop all versions of book_appointment_by_name first
DROP FUNCTION IF EXISTS book_appointment_by_name(TEXT, TEXT, DATE, TIME, TEXT);
DROP FUNCTION IF EXISTS book_appointment_by_name(TEXT, TEXT, DATE, TIME, TEXT, TEXT);
DROP FUNCTION IF EXISTS book_appointment_by_name(TEXT, TEXT, DATE, TIME WITHOUT TIME ZONE, TEXT);
DROP FUNCTION IF EXISTS book_appointment_by_name(TEXT, TEXT, DATE, TIME WITHOUT TIME ZONE, TEXT, TEXT);

-- Recreate with timezone fix
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_shop_id UUID;
  v_prof_id UUID;
  v_appt_id UUID;
  v_start_ts TIMESTAMP WITH TIME ZONE;
  v_shop_timezone TEXT;
BEGIN
  -- Get Shop ID and timezone
  SELECT id, COALESCE(timezone, 'America/Argentina/Buenos_Aires') 
  INTO v_shop_id, v_shop_timezone 
  FROM shops WHERE slug = p_shop_slug LIMIT 1;
  
  IF v_shop_id IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Shop not found');
  END IF;

  -- Get Professional ID
  IF p_professional_name IS NOT NULL THEN
    SELECT id INTO v_prof_id 
    FROM professionals 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_professional_name || '%' 
    LIMIT 1;
    IF v_prof_id IS NULL THEN 
      RETURN jsonb_build_object('success', false, 'error', 'Professional not found');
    END IF;
  ELSE
    SELECT id INTO v_prof_id FROM professionals WHERE shop_id = v_shop_id LIMIT 1;
  END IF;

  -- Construct Timestamp with CORRECT TIMEZONE
  v_start_ts := ((p_date || ' ' || p_time)::timestamp) AT TIME ZONE v_shop_timezone;

  -- Insert Appointment
  INSERT INTO appointments (shop_id, professional_id, customer_name, customer_phone, start_time, end_time, status)
  VALUES (v_shop_id, v_prof_id, p_customer_name, p_customer_phone, v_start_ts, v_start_ts + INTERVAL '1 hour', 'pendiente')
  RETURNING id INTO v_appt_id;

  RETURN jsonb_build_object('success', true, 'appointment_id', v_appt_id, 'professional', p_professional_name);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION book_appointment_by_name(TEXT, TEXT, DATE, TIME, TEXT, TEXT) TO anon, authenticated;
