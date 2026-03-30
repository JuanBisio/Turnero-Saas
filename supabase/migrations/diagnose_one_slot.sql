    -- DIAGNOSE SINGLE SLOT ISSUE
    -- Run this in Supabase SQL Editor and check the results in the "Results" tab.

    -- 1. CHECK SERVICE DURATION
    -- See what duration the database actually has for 'Corte de Pelo'
    SELECT id, name, duration_minutes, shop_id 
    FROM services 
    WHERE shop_id = (SELECT id FROM shops WHERE slug = 'demo')
    AND name ILIKE '%Corte de Pelo%';

    -- 2. CHECK APPOINTMENTS TODAY
    -- See if there are appointments blocking the day
    SELECT start_time, end_time, professional_id 
    FROM appointments 
    WHERE shop_id = (SELECT id FROM shops WHERE slug = 'demo')
    AND start_time::date = CURRENT_DATE
    ORDER BY start_time ASC;

    -- 3. TEST THE FUNCTION DIRECTLY
    -- This simulates exactly what the bot does.
    -- Does this return 1 row or many rows?
    -- (Adjust the date '2026-02-11' to the date you are testing)
    SELECT * FROM get_available_slots(
    CURRENT_DATE,       -- Date
    'Joaquin Fernandez',-- Professional
    'demo',             -- Shop Slug
    'Corte de Pelo'     -- Service Name
    );
