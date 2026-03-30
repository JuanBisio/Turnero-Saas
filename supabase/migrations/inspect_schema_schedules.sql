-- INSPECT SCHEMA FOR SCHEDULES & OPENING HOURS
-- Run this to find where the opening hours are stored!

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('schedules', 'schedule', 'shops', 'professionals')
ORDER BY table_name, ordinal_position;
