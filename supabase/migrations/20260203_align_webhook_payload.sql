-- ALIGN SQL Webhook Payload with Typescript Webhook Payload
-- This ensures consistent behavior whether creating via API or DB

DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
DROP FUNCTION IF EXISTS public.handle_new_appointment();

CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_professional_name TEXT;
    v_shop_record RECORD;
    v_sender_number TEXT;
    v_payload JSONB;
BEGIN
    -- 1. Fetch Shop Data
    SELECT * INTO v_shop_record FROM public.shops WHERE id = NEW.shop_id;

    -- Validate
    IF v_shop_record.webhook_url IS NULL OR v_shop_record.webhook_enabled IS NOT TRUE THEN
        RETURN NEW;
    END IF;

    -- Fetch Sender Number
    v_sender_number := COALESCE(v_shop_record.number_sender::text, v_shop_record.phone, 'NOT_SET');

    -- Fetch Names
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM public.professionals WHERE id = NEW.professional_id;

    -- 2. Construct Payload (NESTED STRUCTURE to match webhookUtils.ts)
    v_payload := jsonb_build_object(
        'event', 'appointment.created',
        'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'shop', jsonb_build_object(
            'id', NEW.shop_id,
            'name', v_shop_record.name,
            'slug', v_shop_record.slug,
            'timezone', COALESCE(v_shop_record.timezone, 'America/Argentina/Buenos_Aires'),
            'phone', v_sender_number -- This matches TS "phone" key which holds the sender number
        ),
        'appointment', jsonb_build_object(
            'id', NEW.id,
            'status', NEW.status,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time
        ),
        'customer', jsonb_build_object(
            'name', NEW.customer_name,
            'phone', NEW.customer_phone, -- Matches body.customer.phone
            'email', NEW.customer_email
        ),
        'professional', jsonb_build_object(
            'id', NEW.professional_id,
            'name', COALESCE(v_professional_name, 'Sin profesional')
        ),
        'service', jsonb_build_object(
            'id', NEW.service_id,
            'name', COALESCE(v_service_name, 'Servicio sin nombre')
        )
    );

    -- 3. Send Request
    PERFORM extensions.http((
        'POST',
        v_shop_record.webhook_url,
        ARRAY[extensions.http_header('Content-Type', 'application/json')],
        'application/json',
        v_payload::text
    )::extensions.http_request);

    -- 4. Log
    INSERT INTO public.webhook_logs (appointment_id, payload, status, response_body)
    VALUES (NEW.id, v_payload, 200, 'Sent via SQL Trigger');

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in webhook: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_appointment_created
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();
