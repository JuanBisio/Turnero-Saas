-- CHECK DATA SCRIPT
-- Run this in Supabase SQL Editor to see what the bot is seeing.

SELECT 
    s.slug as shop_slug,
    p.name as professional_name,
    p.is_active
FROM professionals p
JOIN shops s ON p.shop_id = s.id
WHERE s.slug = 'demo';
