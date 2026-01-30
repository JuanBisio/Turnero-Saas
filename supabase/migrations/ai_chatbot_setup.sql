-- 1. Chat Sessions Table (Memory for the Bot)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    session_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon access to chat_sessions" ON public.chat_sessions FOR ALL USING (true);


-- 2. Add Unique Constraint to Appointments (Prevent Double Booking)
-- We align with the existing schema using 'start_time' instead of separate date/time columns.
-- This ensures no two appointments can exist for the same professional at the exact same time.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointments_unique_slot'
    ) THEN
        ALTER TABLE public.appointments
        ADD CONSTRAINT appointments_unique_slot UNIQUE (professional_id, start_time);
    END IF;
END $$;
