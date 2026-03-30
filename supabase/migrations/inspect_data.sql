-- INSPECT DATA FOR BUG DIAGNOSIS
-- Run this in Supabase SQL Editor

-- 1. Check Appointment (Is it really 12:20?)
SELECT id, start_time, end_time, status, professional_id, shop_id
FROM appointments
WHERE start_time::date = '2026-02-11'
OR start_time::date = '2026-02-10' -- In case timezone shifted it
ORDER BY start_time;

-- 2. Check Schedule (Why only 13 slots?)
-- Get DOW for 2026-02-11 (Wednesday = 3)
SELECT * FROM schedules 
WHERE day_of_week = 3
AND professional_id = (SELECT id FROM professionals WHERE name ILIKE '%Joaquin%' LIMIT 1);

-- 3. Check Shop Timezone
SELECT slug, timezone FROM shops WHERE slug = 'demo';
