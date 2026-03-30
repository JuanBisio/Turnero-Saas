-- DEBUG SCRIPT: Run this to see what your data actually looks like!

-- 1. Check ALL Services for 'demo' shop
SELECT id, name, duration_minutes, shop_id 
FROM services 
WHERE shop_id = (SELECT id FROM shops WHERE slug = 'demo');

-- 2. Check Appointments for today/tomorrow
SELECT start_time, end_time, professional_id, status 
FROM appointments 
WHERE shop_id = (SELECT id FROM shops WHERE slug = 'demo')
AND start_time > NOW()
ORDER BY start_time ASC
LIMIT 10;

-- 3. Run the function MANUALLY to see what it returns
-- Replace '2026-02-xx' with a date you want to test.
-- Replace 'Joaquin Fernandez' with a real professional name.
SELECT * FROM get_available_slots(CURRENT_DATE, 'Joaquin Fernandez', 'demo', NULL);
