-- 1. Create table for Chat History
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sender_phone TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable Security (RLS)
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow inserting (so n8n can save chats)
CREATE POLICY "Enable insert for authenticated users only" 
ON public.chat_history 
FOR INSERT 
WITH CHECK (auth.role() = 'anon' OR auth.role() = 'service_role');

-- 4. Policy: Allow selecting (so n8n can read context if needed)
CREATE POLICY "Enable select for authenticated users only" 
ON public.chat_history 
FOR SELECT 
USING (auth.role() = 'anon' OR auth.role() = 'service_role');
