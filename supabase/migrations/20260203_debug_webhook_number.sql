-- 1. DROP the function completely to ensure clean state
DROP FUNCTION IF EXISTS public.handle_new_appointment() CASCADE;

-- 2. Re-create the function
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    -- Variables to hold data
    v_service_name TEXT;
    v_professional_name TEXT;
    
    -- Shop variables
    v_shop_webhook_url TEXT;
    v_shop_webhook_enabled BOOLEAN;
    v_shop_number_sender TEXT; -- We will store the result here
    
    v_payload JSONB;
    v_response_status INTEGER;
    v_response_body TEXT;
    v_error_msg TEXT;
BEGIN
    -- LOGGING START
    RAISE LOG '---------------------------------------------------';
    RAISE LOG 'WEBHOOK TRIGGER STARTED for Appointment ID: %', NEW.id;
    RAISE LOG 'Looking for Shop ID: %', NEW.shop_id;

    -- 3. Fetch Shop Data
    -- We select specifically the columns properly casted
    SELECT 
        webhook_url, 
        webhook_enabled, 
        CAST(number_sender AS TEXT)
    INTO 
        v_shop_webhook_url, 
        v_shop_webhook_enabled, 
        v_shop_number_sender
    FROM public.shops 
    WHERE id = NEW.shop_id;

    -- LOGGING RESULTS
    RAISE LOG 'Found Shop URL: %', v_shop_webhook_url;
    RAISE LOG 'Found Shop Number (Raw): %', v_shop_number_sender;

    -- Validation
    IF v_shop_webhook_url IS NULL OR v_shop_webhook_enabled IS NOT TRUE THEN
        RAISE LOG 'Webhook disabled or URL missing. Exiting.';
        RETURN NEW;
    END IF;

    -- If null, set a placeholder for debugging
    IF v_shop_number_sender IS NULL THEN
        RAISE LOG 'WARNING: number_sender IS NULL in database!';
        v_shop_number_sender := 'NUMBER_WAS_NULL';
    END IF;

    -- 4. Helper Data
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM public.professionals WHERE id = NEW.professional_id;

    -- 5. Construct Payload
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
        'shop_number_sender', v_shop_number_sender -- Using our verified variable
    );

    RAISE LOG 'Generated Payload: %', v_payload;

    -- 6. Send Request
    BEGIN
        SELECT status, content::text INTO v_response_status, v_response_body
        FROM extensions.http((
            'POST',
            v_shop_webhook_url,
            ARRAY[extensions.http_header('Content-Type', 'application/json')],
            'application/json',
            v_payload::text
        )::extensions.http_request);

        RAISE LOG 'Webhook Sent. Status: %', v_response_status;

        -- 7. Audit Log
        INSERT INTO public.webhook_logs (appointment_id, payload, status, response_body)
        VALUES (NEW.id, v_payload, v_response_status, v_response_body);
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        RAISE LOG 'CRITICAL ERROR Sending Webhook: %', v_error_msg;
        
        INSERT INTO public.webhook_logs (appointment_id, payload, status, error_message)
        VALUES (NEW.id, v_payload, 500, v_error_msg);
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach Trigger
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();
