-- Retrieve the last 5 webhook logs to inspect the payload sent to n8n
-- This will show us EXACTLY what verified_sender_number contains

SELECT 
    created_at, 
    status, 
    LEFT(response_body, 100) as response_preview,
    payload->>'verified_sender_number' as verified_sender,
    payload->>'shop_number_sender' as shop_sender,
    payload->>'shop_id' as shop_id
FROM public.webhook_logs 
ORDER BY created_at DESC 
LIMIT 5;
