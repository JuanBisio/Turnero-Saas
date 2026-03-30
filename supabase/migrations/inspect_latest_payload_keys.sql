-- Inspect the latest webhook payload keys to see what is ACTUALLY being sent
SELECT 
    created_at, 
    -- Show all top-level keys in the payload to verifying structure
    (SELECT string_agg(key, ', ') FROM jsonb_object_keys(payload)) as payload_keys,
    -- Check specific values
    payload->>'shop_number_sender' as flat_sender,
    payload->>'verified_sender_number' as verified_sender,
    payload->'shop'->>'phone' as nested_sender
FROM public.webhook_logs 
ORDER BY created_at DESC 
LIMIT 3;
