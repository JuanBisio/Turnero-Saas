-- Add reason column to exceptions table
ALTER TABLE exceptions 
ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'Bloqueo manual';
