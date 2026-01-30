-- Drop the old function first because we are changing the return type
DROP FUNCTION IF EXISTS update_session(text, text, text, date, text);

-- Function to update session and RETURN the new state immediately
CREATE OR REPLACE FUNCTION update_session(
  p_phone TEXT,
  p_service TEXT DEFAULT NULL,
  p_professional TEXT DEFAULT NULL,
  p_preferred_date DATE DEFAULT NULL,
  p_preferred_time TEXT DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. Ensure record exists
  INSERT INTO whatsapp_sessions(phone)
  VALUES (p_phone)
  ON CONFLICT (phone) DO NOTHING;

  -- 2. Update fields if provided
  UPDATE whatsapp_sessions s
  SET
    service        = COALESCE(p_service, s.service),
    professional   = COALESCE(p_professional, s.professional),
    preferred_date = COALESCE(p_preferred_date, s.preferred_date),
    preferred_time = COALESCE(p_preferred_time, s.preferred_time),
    updated_at     = NOW()
  WHERE s.phone = p_phone
  RETURNING jsonb_build_object(
    'phone', s.phone,
    'service', s.service,
    'professional', s.professional,
    'preferred_date', s.preferred_date,
    'preferred_time', s.preferred_time
  ) INTO v_result;

  RETURN v_result;
END;
$$;
