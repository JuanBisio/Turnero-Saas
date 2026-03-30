-- Script to verify and fix data, then trigger a test appointment

-- 1. FORCE Update the number_sender for the shop (using the ID from your logs)
-- ensuring it is not null
UPDATE public.shops 
SET number_sender = 5493586548065 -- dummy number or your real one
WHERE id = '734c38b7-408c-470e-9653-5251b3fd6e5f';

-- 2. Verify the update
DO $$
DECLARE
    v_num NUMERIC;
BEGIN
    SELECT number_sender INTO v_num FROM public.shops WHERE id = '734c38b7-408c-470e-9653-5251b3fd6e5f';
    RAISE LOG 'VERIFICATION: Shop number_sender is now: %', v_num;
END $$;

-- 3. Insert a TEST appointment to trigger the webhook immediately
INSERT INTO public.appointments (
    shop_id,
    professional_id, -- assuming valid ID, usually ok in current constraint setup or we need to fetch one
    service_id,      -- same here
    customer_name,
    customer_phone,
    customer_email,
    start_time,
    end_time,
    status
)
SELECT 
    id as shop_id,
    (SELECT id FROM public.professionals WHERE shop_id = shops.id LIMIT 1),
    (SELECT id FROM public.services WHERE shop_id = shops.id LIMIT 1),
    'Test Webhook User',
    '+5491100000000',
    'test@webhook.com',
    NOW() + interval '1 day',
    NOW() + interval '1 day 30 minutes',
    'pendiente'
FROM public.shops
WHERE id = '734c38b7-408c-470e-9653-5251b3fd6e5f';
