-- Add timezone column to shops table
-- Default to 'UTC' for existing rows, but new ones should provide their specific timezone

ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Optional: If you want to backfill existing shops to Argentina time (since that was the hardcoded default)
-- UPDATE shops SET timezone = 'America/Argentina/Buenos_Aires' WHERE timezone = 'UTC';
