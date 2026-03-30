-- Migration: Create booking sessions table with state tracking
-- This enables the deterministic state machine flow

-- 1. Create the booking_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.booking_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    service TEXT,
    professional TEXT,
    preferred_date DATE,
    preferred_time TIME,
    current_state TEXT DEFAULT 'IDLE',
    intent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.booking_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write (for the bot)
DROP POLICY IF EXISTS "Allow all for booking_sessions" ON public.booking_sessions;
CREATE POLICY "Allow all for booking_sessions" ON public.booking_sessions
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.booking_sessions TO anon;

-- 2. Add columns if table already existed (won't error if column exists)
ALTER TABLE public.booking_sessions 
ADD COLUMN IF NOT EXISTS current_state TEXT DEFAULT 'IDLE';

-- 2. Add intent column to remember what user wants to do
ALTER TABLE public.booking_sessions 
ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT NULL;

-- 3. Drop and recreate the get_or_create_session function
DROP FUNCTION IF EXISTS public.get_or_create_session(TEXT);
CREATE OR REPLACE FUNCTION public.get_or_create_session(p_phone TEXT)
RETURNS TABLE (
    phone TEXT,
    service TEXT,
    professional TEXT,
    preferred_date DATE,
    preferred_time TIME,
    current_state TEXT,
    intent TEXT
) AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session 
    FROM public.booking_sessions bs 
    WHERE bs.phone = p_phone 
    AND bs.updated_at > NOW() - INTERVAL '30 minutes';
    
    IF v_session IS NULL THEN
        INSERT INTO public.booking_sessions (phone, current_state, intent)
        VALUES (p_phone, 'IDLE', NULL)
        RETURNING * INTO v_session;
    END IF;
    
    RETURN QUERY SELECT 
        v_session.phone,
        v_session.service,
        v_session.professional,
        v_session.preferred_date,
        v_session.preferred_time,
        v_session.current_state,
        v_session.intent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop and recreate update_session function
DROP FUNCTION IF EXISTS public.update_session(TEXT, TEXT, TEXT, DATE, TIME);
DROP FUNCTION IF EXISTS public.update_session(TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_session(
    p_phone TEXT,
    p_service TEXT DEFAULT NULL,
    p_professional TEXT DEFAULT NULL,
    p_preferred_date DATE DEFAULT NULL,
    p_preferred_time TIME DEFAULT NULL,
    p_current_state TEXT DEFAULT NULL,
    p_intent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.booking_sessions SET
        service = COALESCE(p_service, service),
        professional = COALESCE(p_professional, professional),
        preferred_date = COALESCE(p_preferred_date, preferred_date),
        preferred_time = COALESCE(p_preferred_time, preferred_time),
        current_state = COALESCE(p_current_state, current_state),
        intent = COALESCE(p_intent, intent),
        updated_at = NOW()
    WHERE phone = p_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to reset session (for new booking after completion)
CREATE OR REPLACE FUNCTION public.reset_session(p_phone TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.booking_sessions SET
        service = NULL,
        professional = NULL,
        preferred_date = NULL,
        preferred_time = NULL,
        current_state = 'IDLE',
        intent = NULL,
        updated_at = NOW()
    WHERE phone = p_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_session(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.update_session(TEXT, TEXT, TEXT, DATE, TIME, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_session(TEXT) TO anon;
