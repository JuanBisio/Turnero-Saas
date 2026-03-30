-- Check configuration for shop 'joaquin'
-- We verify if webhook is enabled, has a URL, and has a valid number_sender

SELECT 
    id, 
    name, 
    slug, 
    webhook_enabled, 
    webhook_url, 
    number_sender
FROM public.shops
WHERE slug = 'joaquin' OR name ILIKE '%joaquin%';
