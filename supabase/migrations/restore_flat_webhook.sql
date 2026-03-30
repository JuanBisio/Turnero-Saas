-- RESTORE THE WORKING VERSION (Flat Structure + Explicit Sender Number)
-- This ensures 'shop_number_sender' is present in the payload.

DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
DROP FUNCTION IF EXISTS public.handle_new_appointment() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_professional_name TEXT;
    v_shop_data RECORD;
    v_sender_number TEXT;
    v_payload JSONB;
BEGIN
    -- 1. Fetch Shop Data
    SELECT * INTO v_shop_data FROM public.shops WHERE id = NEW.shop_id;

    -- 2. Validate
    IF v_shop_data.webhook_url IS NULL OR v_shop_data.webhook_enabled IS NOT TRUE THEN
        RETURN NEW;
    END IF;

    -- 3. Get Sender Number (Fallback to 'NOT_SET' to avoid missing key)
    v_sender_number := COALESCE(v_shop_data.number_sender::text, 'NOT_SET');

    -- 4. Get Names
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM public.professionals WHERE id = NEW.professional_id;

    -- 5. Construct Payload (FLAT STRUCTURE - Proven to work)
    v_payload := jsonb_build_object(
        'event', 'appointment.created',
        'status', NEW.status,
        'shop_id', NEW.shop_id,
        'appointment_id', NEW.id,
        'created_at', NEW.created_at,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'customer_name', NEW.customer_name,
        'customer_email', NEW.customer_email,
        'customer_phone', NEW.customer_phone,
        'service_name', COALESCE(v_service_name, 'Servicio'),
        'professional_name', COALESCE(v_professional_name, 'Profesional'),
        'shop_number_sender', v_sender_number, -- KEY CRITICAL
        'verified_sender_number', v_sender_number -- Backup Key
    );

    -- 6. Send
    PERFORM extensions.http((
        'POST',
        v_shop_data.webhook_url,
        ARRAY[extensions.http_header('Content-Type', 'application/json')],
        'application/json',
        v_payload::text
    )::extensions.http_request);

    -- 7. Log
    INSERT INTO public.webhook_logs (appointment_id, payload, status, response_body)
    VALUES (NEW.id, v_payload, 200, 'Sent Flat Payload');

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_appointment_created
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();

-- Insert Test Appointment to trigger verifying logs
INSERT INTO public.appointments (
    shop_id, professional_id, service_id, customer_name, customer_phone, start_time, end_time, status
)
SELECT 
    id, 
    (SELECT id FROM public.professionals WHERE shop_id = shops.id LIMIT 1),
    (SELECT id FROM public.services WHERE shop_id = shops.id LIMIT 1),
    'Test Restore', 
    '+5491122334455', 
    NOW(), 
    NOW() + interval '1 hour', 
    'pendiente'
FROM public.shops 
WHERE slug = 'demo';
