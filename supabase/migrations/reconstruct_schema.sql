-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SHOPS TABLE (Base)
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    domain TEXT,
    api_key_n8n TEXT,
    public_key TEXT,
    theme JSONB DEFAULT '{}'::jsonb,
    
    -- Webhook columns (from 005_webhooks.sql)
    webhook_url TEXT,
    webhook_enabled BOOLEAN DEFAULT false,
    webhook_secret TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PROFESSIONALS TABLE
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    buffer_time_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pendiente', -- pendiente, confirmado, cancelado, completado, no_asistio
    cancellation_token TEXT UNIQUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. WEBHOOK_LOGS TABLE (The one we were trying to fix)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 6. ENABLE RLS (Security)
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- 7. BASIC POLICIES (Open for Public Widget access, authenticated for Admin)
-- Allow public read access to shops/services/professionals for the widget
CREATE POLICY "Public read access to shops" ON public.shops FOR SELECT USING (true);
CREATE POLICY "Public read access to services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Public read access to professionals" ON public.professionals FOR SELECT USING (true);

-- Appointments: Public insert (creation), Authenticated select (dashboard)
CREATE POLICY "Public create appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated view appointments" ON public.appointments FOR SELECT USING (auth.role() = 'authenticated');

-- Webhook Logs: Authenticated only
CREATE POLICY "Authenticated view webhook logs" ON public.webhook_logs FOR SELECT USING (auth.role() = 'authenticated');

