-- 1. Primero, eliminamos los duplicados existentes.
-- Mantenemos el turno con el ID más alto (el creado más recientemente)
-- y borramos los anteriores que coincidan en profesional y horario.

DELETE FROM appointments a
USING appointments b
WHERE a.id < b.id              -- Borra 'a' si tiene un ID menor que 'b'
AND a.professional_id = b.professional_id
AND a.start_time = b.start_time
AND a.status != 'cancelado'
AND b.status != 'cancelado';

-- 2. Ahora sí, creamos el índice único para evitar futuros duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment 
ON appointments (professional_id, start_time) 
WHERE status != 'cancelado';
