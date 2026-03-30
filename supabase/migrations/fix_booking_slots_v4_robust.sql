-- FIX BOOKING SLOTS & SERVICES (v4 - ROBUST & SAFER)
-- 1. FIXES "Single Slot" bug by ensuring reasonable duration constraints.
-- 2. FIXES "Missing Column" bug by removing is_active check for services.
-- 3. ADDS support for "p_service_name" so slots match the actual service duration.

-- =============================================
-- PART 1: FIX SERVICES IN CONTEXT
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
  -- 1. Get Shop Info
  SELECT id, name INTO v_shop_id, v_shop_name FROM shops WHERE slug = p_slug;

  IF v_shop_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Shop not found');
  END IF;

  -- 2. Get Professionals (Active)
  SELECT string_agg(name, ', ') INTO v_pros
  FROM professionals
  WHERE shop_id = v_shop_id
  AND is_active = true;

  -- 3. Get Services (No is_active check)
  SELECT string_agg(name || ' (' || duration_minutes || 'm)', ', ') INTO v_services
  FROM services
  WHERE shop_id = v_shop_id;

  -- 4. History
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
-- PART 2: FIX AVAILABLE SLOTS (ROBUST)
-- =============================================

-- Drop ALL old versions to avoid ambiguity
DROP FUNCTION IF EXISTS get_available_slots(date, uuid);
DROP FUNCTION IF EXISTS get_available_slots(date, text);
DROP FUNCTION IF EXISTS get_available_slots(date, text, text);
DROP FUNCTION IF EXISTS get_available_slots(date, text, text, text);

CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_professional_name TEXT DEFAULT NULL,
  p_shop_slug TEXT DEFAULT 'demo',
  p_service_name TEXT DEFAULT NULL  -- Added parameter
) 
RETURNS TABLE (slot TIME) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_start TIME := '09:00:00'; 
  r_end   TIME := '21:00:00';
  curr    TIME;
  v_shop_id UUID;
  v_professional_id UUID;
  v_service_duration INTEGER;
  v_interval INTERVAL;
BEGIN
  -- 1. Get Shop ID
  SELECT id INTO v_shop_id FROM shops WHERE slug = p_shop_slug LIMIT 1;
  IF v_shop_id IS NULL THEN RETURN; END IF;

  -- 2. Get Professional ID
  IF p_professional_name IS NOT NULL AND p_professional_name != '' AND p_professional_name != 'Cualquiera' THEN
    SELECT id INTO v_professional_id 
    FROM professionals 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_professional_name || '%' 
    LIMIT 1;
  END IF;

  -- 3. Determine Duration (The Fix)
  -- A. Try specific service if valid
  IF p_service_name IS NOT NULL AND p_service_name != '' THEN
    SELECT duration_minutes INTO v_service_duration
    FROM services 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_service_name || '%' 
    LIMIT 1;
  END IF;

  -- B. Fallback: Use SHORTEST service (Safe heuristic: Shows more slots)
  --    If we picked the longest, we might hide valid slots.
  IF v_service_duration IS NULL THEN
    SELECT duration_minutes INTO v_service_duration
    FROM services 
    WHERE shop_id = v_shop_id
    ORDER BY duration_minutes ASC 
    LIMIT 1;
  END IF;

  -- C. Safety Net (Prevent 0 or NULL causing infinite loops)
  v_service_duration := GREATEST(COALESCE(v_service_duration, 30), 15);
  v_interval := (v_service_duration || ' minutes')::interval;

  -- 4. Generate Slots
  curr := r_start;
  WHILE curr + v_interval <= r_end LOOP
    
    IF NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.start_time::date = p_date
      AND a.shop_id = v_shop_id
      AND a.status NOT IN ('cancelado', 'no_asistio')
      AND (v_professional_id IS NULL OR a.professional_id = v_professional_id)
      AND (
        (curr < a.end_time::time) AND ((curr + v_interval) > a.start_time::time)
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
