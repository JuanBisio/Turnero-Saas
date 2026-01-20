-- FIX: Drop and Recreate webhook_logs to ensure correct schema
-- This will wipe existing logs, which is acceptable for a log table during dev.

DROP TABLE IF EXISTS public.webhook_logs CASCADE;

CREATE TABLE public.webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL, -- Ensure this column exists!
    payload JSONB,
    status TEXT,
    response_body TEXT,
    error_message TEXT
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (devs/admins)
CREATE POLICY "Allow read access for authenticated users" ON public.webhook_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT ON public.webhook_logs TO service_role;
GRANT SELECT ON public.webhook_logs TO authenticated;

-- Notify
SELECT 'Webhook logs table recreated successfully' as status;
