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
    to_char(a.start_time, 'YYYY-MM-DD') as appointment_date,
    to_char(a.start_time, 'HH24:MI') as appointment_time
  FROM appointments a
  JOIN services s ON a.service_id = s.id
  JOIN professionals p ON a.professional_id = p.id
  WHERE a.customer_phone = p_phone
  AND a.start_time > now()
  AND a.status = 'confirmado' -- Fixed: 'confirmed' -> 'confirmado'
  ORDER BY a.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
