-- Simplest possible query to see WHAT is inside the payload
-- Just dump the whole JSON as text so we can read it directly
SELECT 
    created_at, 
    payload::text -- Casting to text makes it readable
FROM public.webhook_logs 
ORDER BY created_at DESC 
LIMIT 1;
