-- Permite a un profesional inactivo mostrar un motivo opcional (ej: vacaciones,
-- licencia) para que el cliente vea por qué no está disponible en el widget.
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS inactive_reason TEXT;

COMMENT ON COLUMN professionals.inactive_reason IS
  'Mensaje opcional mostrado en el widget público cuando is_active = false, explicando el motivo de la inactividad.';
