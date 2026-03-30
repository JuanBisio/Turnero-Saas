-- 1. Ensure the trigger function is the latest and greatest (Flat structure is easier for debugging)
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_shop_data RECORD;
    v_payload JSONB;
BEGIN
    -- Fetch shop
    SELECT * INTO v_shop_data FROM public.shops WHERE id = NEW.shop_id;

    -- Default sender number if null
    -- This ensures the key ALWAYS exists in the JSON
    v_company_tel := COALESCE(v_shop_data.number_sender::text, '5493586548065');

    -- Build Payload
    v_payload := jsonb_build_object(
        'event', 'appointment.created',
        'created_at', NEW.created_at,
        'shop_id', NEW.shop_id,
        'shop_slug', v_shop_data.slug,
        'shop_number_sender', v_company_tel,    -- Primary key for N8N
        'verified_sender_number', v_company_tel, -- Backup key
        'customer_phone', NEW.customer_phone,
        'customer_name', NEW.customer_name
    );

    -- Send Webhook if enabled
    IF v_shop_data.webhook_url IS NOT NULL AND v_shop_data.webhook_enabled IS TRUE THEN
        PERFORM extensions.http((
            'POST',
            v_shop_data.webhook_url,
            ARRAY[extensions.http_header('Content-Type', 'application/json')],
            'application/json',
            v_payload::text
        )::extensions.http_request);
    END IF;

    -- ALWAYS Log to DB for debugging, even if webhook disabled (for visibility)
    INSERT INTO public.webhook_logs (appointment_id, payload, status, response_body)
    VALUES (NEW.id, v_payload, 200, 'Test Trigger Output');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();

-- 3. INSERT a fresh test appointment to generate a NEW log entry RIGHT NOW
INSERT INTO public.appointments (
    shop_id, professional_id, service_id, customer_name, customer_phone, start_time, end_time, status
)
SELECT 
    id, 
    (SELECT id FROM public.professionals WHERE shop_id = shops.id LIMIT 1),
    (SELECT id FROM public.services WHERE shop_id = shops.id LIMIT 1),
    'TEST_DEBUG_NOW_' || to_char(NOW(), 'HH24:MI:SS'), -- Unique name
    '+5491100000000', 
    NOW(), 
    NOW() + interval '30 minutes', 
    'pendiente'
FROM public.shops 
WHERE slug = 'demo' -- Use 'demo' or 'joaquin' as needed, demo is usually safe
LIMIT 1;

-- 4. READ back exactly that log entry
SELECT 
    created_at, 
    payload->>'shop_number_sender' as SENT_SENDER_NUMBER,
    payload::text as FULL_PAYLOAD
FROM public.webhook_logs 
ORDER BY created_at DESC 
LIMIT 1;
