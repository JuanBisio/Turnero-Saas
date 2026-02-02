-- Update n8n Webhook URLs for new Hostinger instance

BEGIN;

-- 1. Update the Trigger Function for New Appointments
-- Defines the correct n8n URL: https://n8n.srv1323734.hstgr.cloud/webhook/appointment-created
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_shop_name TEXT;
    -- UPDATED URL
    v_n8n_url TEXT := 'https://n8n.srv1323734.hstgr.cloud/webhook/appointment-created';
    v_phone TEXT;
    v_payload JSONB;
    v_response_status INTEGER;
    v_response_body TEXT;
    v_error_msg TEXT;
BEGIN
    -- 1. Fetch related data
    SELECT name INTO v_shop_name FROM public.shops WHERE id = NEW.shop_id;
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

    -- 2. Format Phone Number (+54 default for Argentina)
    v_phone := regexp_replace(NEW.customer_phone, '[\s-]', '', 'g');
    
    IF v_phone NOT LIKE '+%' THEN
        v_phone := '+54' || v_phone;
    END IF;

    -- 3. Construct Payload
    v_payload := jsonb_build_object(
        'phone', v_phone,
        'name', NEW.customer_name,
        'service', COALESCE(v_service_name, 'Servicio General'),
        'date', to_char(NEW.start_time::timestamp, 'YYYY-MM-DD'),
        'time', to_char(NEW.start_time::timestamp, 'HH24:MI'),
        'shop_name', COALESCE(v_shop_name, 'Turnero')
    );

    -- 4. Send Webhook (Synchronous capture)
    BEGIN
        SELECT status, content::text INTO v_response_status, v_response_body
        FROM extensions.http((
            'POST',
            v_n8n_url,
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
        INSERT INTO public.webhook_logs (appointment_id, payload, status, error_message)
        VALUES (NEW.id, v_payload, 500, v_error_msg);
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update 'shops' table webhook_url if it contains the old n8n domain
-- Matches 'bisiojuan.app.n8n.cloud' and replaces it with 'n8n.srv1323734.hstgr.cloud'
UPDATE public.shops
SET webhook_url = REPLACE(webhook_url, 'bisiojuan.app.n8n.cloud', 'n8n.srv1323734.hstgr.cloud')
WHERE webhook_url LIKE '%bisiojuan.app.n8n.cloud%';

COMMIT;
