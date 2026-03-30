-- 1. DROP EVERYTHING related to this webhook to clean the slate
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
DROP FUNCTION IF EXISTS public.handle_new_appointment();

-- 2. Define the properly fixed function
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_professional_name TEXT;
    v_shop_data RECORD;
    v_sender_number TEXT;
    v_payload JSONB;
BEGIN
    -- debug: log the start
    RAISE LOG 'Running handle_new_appointment for Appointment %', NEW.id;

    -- fetch shop data safely
    SELECT * INTO v_shop_data FROM public.shops WHERE id = NEW.shop_id;

    -- validate webhook enabled
    IF v_shop_data.webhook_url IS NULL OR v_shop_data.webhook_enabled IS NOT TRUE THEN
        RETURN NEW;
    END IF;

    -- fetch sender number aggressively
    -- we expect the column 'number_sender' to exist.
    -- If it doesn't, this line might fail, revealing the issue.
    -- If it is null, we return 'NOT_FOUND' to verify the column exists but is empty.
    v_sender_number := COALESCE(v_shop_data.number_sender::text, 'NOT_FOUND_IN_DB');

    -- fetch other names
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM public.professionals WHERE id = NEW.professional_id;

    -- build payload with NEW KEYS to verify update
    v_payload := jsonb_build_object(
        'event', 'appointment.created',
        'status', NEW.status,
        'shop_id', NEW.shop_id,
        'appointment_id', NEW.id,
        'created_at', NEW.created_at,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'start_time_formatted', to_char(NEW.start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
        'service_name', COALESCE(v_service_name, 'Servicio sin nombre'),
        'customer_name', NEW.customer_name,
        'customer_email', NEW.customer_email,
        'customer_phone', NEW.customer_phone,
        'professional_name', COALESCE(v_professional_name, 'Sin profesional'),
        'verified_sender_number', v_sender_number, -- NEW KEY NAME
        'shop_number_sender', v_sender_number      -- KEEP OLD KEY for n8n compatibility
    );

    -- send request
    PERFORM extensions.http((
        'POST',
        v_shop_data.webhook_url,
        ARRAY[extensions.http_header('Content-Type', 'application/json')],
        'application/json',
        v_payload::text
    )::extensions.http_request);

    -- log it
    INSERT INTO public.webhook_logs (appointment_id, payload, status, response_body)
    VALUES (NEW.id, v_payload, 200, 'Sent');

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in webhook: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the Trigger
CREATE TRIGGER on_appointment_created
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();

-- 4. TEST: Insert a dummy appointment to verify IMMEDIATELY
INSERT INTO public.appointments (
    shop_id,
    professional_id,
    service_id,
    customer_name,
    customer_phone,
    customer_email,
    start_time,
    end_time,
    status
)
SELECT 
    id,
    (SELECT id FROM public.professionals WHERE shop_id = shops.id LIMIT 1),
    (SELECT id FROM public.services WHERE shop_id = shops.id LIMIT 1),
    'Test Verify Update',
    '+549999999999',
    'test@verify.com',
    NOW() + interval '2 days',
    NOW() + interval '2 days 1 hour',
    'pendiente'
FROM public.shops
WHERE id = '734c38b7-408c-470e-9653-5251b3fd6e5f';
