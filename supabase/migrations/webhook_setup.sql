-- Enable the HTTP extension for webhook requests
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

-- Create table for logging webhook attempts and responses
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    appointment_id UUID REFERENCES public.appointments(id),
    payload JSONB,
    status INTEGER,
    response_body TEXT,
    error_message TEXT
);

-- Enable Row Level Security
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (Dashboard usage)
CREATE POLICY "Enable read access for authenticated users" ON public.webhook_logs
    FOR SELECT TO authenticated USING (true);

-- Function to handle new appointments and trigger webhook
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_shop_name TEXT;
    -- REPLACE THE URL BELOW WITH YOUR N8N WEBHOOK URL
    v_n8n_url TEXT := 'https://your-n8n-instance.com/webhook/placeholder'; 
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
    -- Removes spaces and hyphens first to be cleaner
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

-- Trigger Definition
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
    AFTER INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_appointment();
