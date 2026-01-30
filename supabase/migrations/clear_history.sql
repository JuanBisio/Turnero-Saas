-- 🚨 CLEAR HISTORY SCRIPT 🚨
-- Borra todo el historial de chat para un número específico.

-- Reemplaza el número por el tuyo si es distinto (formato internacional sin espacios)
DELETE FROM chat_history 
WHERE sender_phone = '+5493584014857';

-- Opcional: Borrar TODO de todos (solo para desarrollo)
-- DELETE FROM chat_history;
