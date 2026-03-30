-- FORCE UPDATE handle_new_appointment
-- Uses public.shops table and number_sender column
-- Adds logging for debugging in Supabase -> Database -> Postgres Logs

CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_professional_name TEXT;
    
    v_shop_webhook_url TEXT;
    v_shop_webhook_enabled BOOLEAN;
    v_shop_number_sender TEXT;
    
    v_payload JSONB;
    v_response_status INTEGER;
    v_response_body TEXT;
    v_error_msg TEXT;
BEGIN
    -- DEBUG LOG
    RAISE LOG 'Webhook Trigger: Processing Appointment % for Shop %', NEW.id, NEW.shop_id;

    -- 1. Fetch Shop Details from 'shops' table
    SELECT 
        webhook_url, 
        webhook_enabled, 
        COALESCE(CAST(number_sender AS TEXT), 'NUMBER_IS_NULL_IN_DB') -- Debug fallback
    INTO 
        v_shop_webhook_url, 
        v_shop_webhook_enabled, 
        v_shop_number_sender
    FROM public.shops 
    WHERE id = NEW.shop_id;

    -- Prevent execution if webhook is disabled
    IF v_shop_webhook_url IS NULL OR v_shop_webhook_enabled IS NOT TRUE THEN
        RAISE LOG 'Webhook Skipped: Not enabled for shop %', NEW.shop_id;
        RETURN NEW;
    END IF;

    -- 2. Fetch Helper Names
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
    SELECT name INTO v_professional_name FROM public.professionals WHERE id = NEW.professional_id;

    -- 3. Construct Payload
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
        'shop_number_sender', v_shop_number_sender
    );

    -- 4. Send Webhook
    BEGIN
        SELECT status, content::text INTO v_response_status, v_response_body
        FROM extensions.http((
            'POST',
            v_shop_webhook_url,
            ARRAY[extensions.http_header('Content-Type', 'application/json')],
            'application/json',
            v_payload::text
        )::extensions.http_request);

        -- 5. Log Success/Response
        INSERT INTO public.webhook_logs (appointment_id, payload, status, response_body)
        VALUES (NEW.id, v_payload, v_response_status, v_response_body);
        
    EXCEPTION WHEN OTHERS THEN
        -- 6. Log Failure
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        RAISE LOG 'Webhook Error: %', v_error_msg;
        INSERT INTO public.webhook_logs (appointment_id, payload, status, error_message)
        VALUES (NEW.id, v_payload, 500, v_error_msg);
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
