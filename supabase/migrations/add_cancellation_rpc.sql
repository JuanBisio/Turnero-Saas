-- Function to get pending appointments for a client phone
CREATE OR REPLACE FUNCTION get_client_appointments(p_phone text)
RETURNS TABLE (
  appointment_id uuid,
  service_name text,
  professional_name text,
  appointment_date text,
  appointment_time text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    s.name as service_name,
    p.name as professional_name,
    to_char(a.start_time AT TIME ZONE sh.timezone, 'YYYY-MM-DD') as appointment_date,
    to_char(a.start_time AT TIME ZONE sh.timezone, 'HH24:MI') as appointment_time
  FROM appointments a
  JOIN services s ON a.service_id = s.id
  JOIN professionals p ON a.professional_id = p.id
  JOIN shops sh ON a.shop_id = sh.id
  WHERE a.customer_phone = p_phone
  AND a.start_time > now()
  AND a.status = 'confirmado'
  ORDER BY a.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel an appointment
CREATE OR REPLACE FUNCTION cancel_appointment(p_appointment_id uuid)
RETURNS json
AS $$
DECLARE
  v_appointment_id uuid;
BEGIN
  UPDATE appointments
  SET status = 'cancelado'
  WHERE id = p_appointment_id::uuid
  RETURNING id INTO v_appointment_id;

  IF v_appointment_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Turno no encontrado o ya cancelado');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Turno cancelado exitosamente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
