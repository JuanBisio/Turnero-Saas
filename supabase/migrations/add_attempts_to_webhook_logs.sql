-- ROBUST MIGRATION: Repair webhook_logs table
-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    event_type TEXT,
    payload JSONB,
    url TEXT,
    status_code INTEGER,
    success BOOLEAN,
    error_message TEXT,
    attempts INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure columns exist if table already existed but was incomplete
DO $$ 
BEGIN 
    -- Add attempts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='webhook_logs' AND column_name='attempts') THEN
        ALTER TABLE public.webhook_logs ADD COLUMN attempts INTEGER DEFAULT 1;
    END IF;

    -- Add shop_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='webhook_logs' AND column_name='shop_id') THEN
        ALTER TABLE public.webhook_logs ADD COLUMN shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;
    END IF;

    -- Add event_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='webhook_logs' AND column_name='event_type') THEN
        ALTER TABLE public.webhook_logs ADD COLUMN event_type TEXT;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- 4. Grant permissions
GRANT ALL ON public.webhook_logs TO postgres;
GRANT ALL ON public.webhook_logs TO service_role;
GRANT SELECT ON public.webhook_logs TO authenticated;

-- 5. Create Policies (Drop first to avoid errors)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.webhook_logs;
CREATE POLICY "Enable read access for authenticated users" ON public.webhook_logs FOR SELECT USING (auth.role() = 'authenticated');
