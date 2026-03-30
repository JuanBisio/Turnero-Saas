-- Fixed final verify script (missing declaration fix)
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;         -- Added
    v_professional_name TEXT;    -- Added
    v_shop_data RECORD;
    v_company_tel TEXT;          -- Added missing declaration
    v_payload JSONB;
BEGIN
    -- Fetch Shop
    SELECT * INTO v_shop_data FROM public.shops WHERE id = NEW.shop_id;

    -- Fetch Names to make payload complete
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM public.professionals WHERE id = NEW.professional_id;

    -- Sender Logic (Use 'NOT_SET' to make it obvious if DB is empty)
    v_company_tel := COALESCE(v_shop_data.number_sender::text, 'NOT_SET');

    -- Build Payload
    v_payload := jsonb_build_object(
        'event', 'appointment.created',
        'status', NEW.status,
        'shop_id', NEW.shop_id,
        'appointment_id', NEW.id,
        'created_at', NEW.created_at,
        'start_time', NEW.start_time,
        'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), -- For timestamp check
        
        -- Keys required by n8n
        'customer_name', NEW.customer_name,
        'customer_phone', NEW.customer_phone,
        'service_name', COALESCE(v_service_name, 'Servicio'),
        'professional_name', COALESCE(v_professional_name, 'Profesional'),
        
        -- CRITICAL KEYS FOR SENDER
        'shop_number_sender', v_company_tel,   
        'verified_sender_number', v_company_tel,

        -- Nested structure for completeness
        'shop', jsonb_build_object(
            'phone', v_company_tel,
            'slug', v_shop_data.slug
        )
    );

    IF v_shop_data.webhook_url IS NOT NULL AND v_shop_data.webhook_enabled IS TRUE THEN
        PERFORM extensions.http((
            'POST',
            v_shop_data.webhook_url,
            ARRAY[extensions.http_header('Content-Type', 'application/json')],
            'application/json',
            v_payload::text
        )::extensions.http_request);
    END IF;

    -- Log to DB
    INSERT INTO public.webhook_logs (appointment_id, payload, status, response_body)
    VALUES (NEW.id, v_payload, 200, 'Verify output');

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in webhook: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind trigger (just in case)
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();

-- Create test appointment
INSERT INTO public.appointments (
    shop_id, professional_id, service_id, customer_name, customer_phone, start_time, end_time, status
)
SELECT 
    id, 
    (SELECT id FROM public.professionals WHERE shop_id = shops.id LIMIT 1),
    (SELECT id FROM public.services WHERE shop_id = shops.id LIMIT 1),
    'TEST_VERIFY_' || floor(random() * 1000)::text,
    '+5491112345678', 
    NOW() + interval '1 day', 
    NOW() + interval '1 day 30 mins',
    'pendiente'
FROM public.shops 
WHERE slug = 'demo' -- Use a known good shop
LIMIT 1;

-- Show output
SELECT 
    created_at, 
    payload->>'shop_number_sender' as SENDER_NUMBER,
    payload::text as FULL_JSON
FROM public.webhook_logs 
ORDER BY created_at DESC 
LIMIT 1;
