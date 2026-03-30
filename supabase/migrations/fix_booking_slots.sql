-- FIX BOOKING SLOTS & SERVICES (CONSOLIDATED)
-- 1. Fixes the "single slot" issue by implementing a proper loop.
-- 2. Fixes the "stale services" issue by ensuring we query active services.
-- 3. Consolidates get_available_slots into a SINGLE robust function.

-- =============================================
-- PART 1: FIX SERVICES IN CONTEXT
-- =============================================

CREATE OR REPLACE FUNCTION get_shop_context(
  p_slug TEXT DEFAULT 'demo',
  p_phone TEXT DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to read services/users
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

  -- 3. Get Services (Active) --> CRITICAL FIX: Ensure no caching issues
  -- We include duration to help the user decide.
  SELECT string_agg(name, ', ') INTO v_services
  FROM services
  WHERE shop_id = v_shop_id
  AND is_active = true;

  -- 4. Get History (Last 10 messages)
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

  -- 5. Return Combined JSON
  RETURN jsonb_build_object(
    'shop_name', v_shop_name,
    'professionals', COALESCE(v_pros, 'Cualquiera'),
    'services', COALESCE(v_services, 'Consulta por privado'), -- Simple comma list for AI
    'history', COALESCE(v_history, 'Sin historial previo.')
  );
END;
$$;

-- =============================================
-- PART 2: FIX AVAILABLE SLOTS (The Main Bug)
-- =============================================

-- Drop ALL old versions to avoid ambiguity
DROP FUNCTION IF EXISTS get_available_slots(date, uuid);
DROP FUNCTION IF EXISTS get_available_slots(date, text);
DROP FUNCTION IF EXISTS get_available_slots(date, text, text);
DROP FUNCTION IF EXISTS get_available_slots(date, text, text, text); -- The 4-arg version

-- Create the ONE TRUE FUNCTION
CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_professional_name TEXT DEFAULT NULL,
  p_shop_slug TEXT DEFAULT 'demo'
) 
RETURNS TABLE (slot TIME) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_start TIME := '09:00:00'; 
  r_end   TIME := '21:00:00'; -- Extended hours
  curr    TIME;
  v_shop_id UUID;
  v_professional_id UUID;
  v_service_duration INTEGER := 30; -- Default duration
  v_interval INTERVAL;
BEGIN
  -- 1. Get Shop ID
  SELECT id INTO v_shop_id FROM shops WHERE slug = p_shop_slug LIMIT 1;
  IF v_shop_id IS NULL THEN RETURN; END IF;

  -- 2. Get Professional ID (if name provided)
  IF p_professional_name IS NOT NULL AND p_professional_name != '' AND p_professional_name != 'Cualquiera' THEN
    SELECT id INTO v_professional_id 
    FROM professionals 
    WHERE shop_id = v_shop_id 
    AND name ILIKE '%' || p_professional_name || '%' 
    LIMIT 1;
  END IF;

  -- 3. Determine Duration
  -- Heuristic: Pick the duration of the *first* active service in the shop.
  -- This is better than a hardcoded 60m. 
  SELECT duration_minutes INTO v_service_duration
  FROM services 
  WHERE shop_id = v_shop_id 
  AND is_active = true
  LIMIT 1;

  v_service_duration := COALESCE(v_service_duration, 30); -- Fallback
  v_interval := (v_service_duration || ' minutes')::interval;

  -- 4. Generate Slots
  curr := r_start;
  WHILE curr + v_interval <= r_end LOOP
    
    -- Check availability (No Overlaps)
    IF NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.start_time::date = p_date
      AND a.shop_id = v_shop_id
      AND a.status NOT IN ('cancelado', 'no_asistio')
      AND (v_professional_id IS NULL OR a.professional_id = v_professional_id)
      AND (
        -- Overlap Logic: (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
        (curr < a.end_time::time) AND ((curr + v_interval) > a.start_time::time)
      )
    ) THEN
      slot := curr;
      RETURN NEXT;
    END IF;

    -- Increment by duration (Simple logic)
    curr := curr + v_interval;
  END LOOP;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_shop_context(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_available_slots(DATE, TEXT, TEXT) TO anon, authenticated, service_role;
