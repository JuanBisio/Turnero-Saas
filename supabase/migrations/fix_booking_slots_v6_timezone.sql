-- FIX BOOKING SLOTS & SERVICES (v6 - TIMEZONE FIX)
-- 1. FIXES CRITICAL BUG: Configures overlap check to respect Shop Timezone.
--    Previously, it compared Shop Local Time vs UTC Database Time, causing overlaps to differ by 3+ hours.
-- 2. Keeps all previous fixes (Dynamic Schedules, Service Name, Safety Checks).

-- =============================================
-- PART 1: FIX SERVICES IN CONTEXT (unchanged)
-- =============================================

DROP FUNCTION IF EXISTS get_shop_context(text, text);

CREATE OR REPLACE FUNCTION get_shop_context(
  p_slug TEXT DEFAULT 'demo',
  p_phone TEXT DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
  v_shop_name TEXT;
  v_pros TEXT;
  v_services TEXT;
  v_history TEXT := '';
BEGIN
  SELECT id, name INTO v_shop_id, v_shop_name FROM shops WHERE slug = p_slug;

  IF v_shop_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Shop not found');
  END IF;

  SELECT string_agg(name, ', ') INTO v_pros
  FROM professionals
  WHERE shop_id = v_shop_id
  AND is_active = true;

  SELECT string_agg(name || ' (' || duration_minutes || 'm)', ', ') INTO v_services
  FROM services
  WHERE shop_id = v_shop_id;

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

  RETURN jsonb_build_object(
    'shop_name', v_shop_name,
    'professionals', COALESCE(v_pros, 'Cualquiera'),
    'services', COALESCE(v_services, 'Consulta por privado'),
    'history', COALESCE(v_history, 'Sin historial previo.')
  );
END;
$$;

-- =============================================
-- PART 2: FIX AVAILABLE SLOTS (TIMEZONE AWARE)
-- =============================================

DROP FUNCTION IF EXISTS get_available_slots(date, uuid);
DROP FUNCTION IF EXISTS get_available_slots(date, text);
DROP FUNCTION IF EXISTS get_available_slots(date, text, text);
DROP FUNCTION IF EXISTS get_available_slots(date, text, text, text);

CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_professional_name TEXT DEFAULT NULL,
  p_shop_slug TEXT DEFAULT 'demo',
  p_service_name TEXT DEFAULT NULL
) 
RETURNS TABLE (slot TIME) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_start TIME; 
  r_end   TIME;
  curr    TIME;
  v_shop_id UUID;
  v_timezone TEXT;
  v_professional_id UUID;
  v_service_duration INTEGER;
  v_interval INTERVAL;
  v_dow INTEGER;
BEGIN
  -- 1. Get Shop ID & Timezone
  SELECT id, timezone INTO v_shop_id, v_timezone FROM shops WHERE slug = p_shop_slug LIMIT 1;
  IF v_shop_id IS NULL THEN RETURN; END IF;
  
  -- Default timezone if missing
  v_timezone := COALESCE(v_timezone, 'America/Argentina/Buenos_Aires');

  -- 2. Get Professional ID
  IF p_professional_name IS NOT NULL AND p_professional_name != '' AND p_professional_name != 'Cualquiera' THEN
    SELECT id INTO v_professional_id 
    FROM professionals 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_professional_name || '%' 
    LIMIT 1;
  END IF;

  -- 3. Determine Schedule
  v_dow := EXTRACT(DOW FROM p_date)::INTEGER;

  IF v_professional_id IS NOT NULL THEN
    SELECT start_time, end_time INTO r_start, r_end
    FROM schedules
    WHERE professional_id = v_professional_id
    AND day_of_week = v_dow;
  ELSE
    SELECT MIN(s.start_time), MAX(s.end_time) INTO r_start, r_end
    FROM schedules s
    JOIN professionals p ON s.professional_id = p.id
    WHERE p.shop_id = v_shop_id
    AND p.is_active = true
    AND s.day_of_week = v_dow;
  END IF;

  IF r_start IS NULL OR r_end IS NULL THEN
    RETURN;
  END IF;

  -- 4. Determine Duration
  IF p_service_name IS NOT NULL AND p_service_name != '' THEN
    SELECT duration_minutes INTO v_service_duration
    FROM services 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_service_name || '%' 
    LIMIT 1;
  END IF;

  IF v_service_duration IS NULL THEN
    SELECT duration_minutes INTO v_service_duration
    FROM services 
    WHERE shop_id = v_shop_id
    ORDER BY duration_minutes ASC 
    LIMIT 1;
  END IF;

  v_service_duration := GREATEST(COALESCE(v_service_duration, 30), 15);
  v_interval := (v_service_duration || ' minutes')::interval;

  -- 5. Generate Slots (TIMEZONE AWARE)
  curr := r_start;
  WHILE curr + v_interval <= r_end LOOP
    
    -- Check availability
    IF NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.shop_id = v_shop_id
      AND a.status NOT IN ('cancelado', 'no_asistio')
      AND (v_professional_id IS NULL OR a.professional_id = v_professional_id)
      
      -- TIMEZONE FIX: Convert DB UTC Timestamp -> Shop Local Time for comparison
      AND (a.start_time AT TIME ZONE v_timezone)::date = p_date
      AND (
        (curr < (a.end_time AT TIME ZONE v_timezone)::time) 
        AND 
        ((curr + v_interval) > (a.start_time AT TIME ZONE v_timezone)::time)
      )
    ) THEN
      slot := curr;
      RETURN NEXT;
    END IF;

    curr := curr + v_interval;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION get_shop_context(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_available_slots(DATE, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
