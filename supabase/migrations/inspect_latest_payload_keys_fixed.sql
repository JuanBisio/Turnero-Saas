-- Fixed query to inspect latest payload keys correctly
WITH latest_log AS (
    SELECT payload, created_at 
    FROM public.webhook_logs 
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    l.created_at,
    (SELECT string_agg(key, ', ') FROM jsonb_object_keys(l.payload) AS key) as payload_keys,
    l.payload->>'shop_number_sender' as flat_sender,
    l.payload->>'verified_sender_number' as verified_sender,
    l.payload->'shop'->>'phone' as nested_sender
FROM latest_log l;
