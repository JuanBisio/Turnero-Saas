-- Enable Realtime for Inbox Tables
-- This ensures that 'postgres_changes' events are actually sent to the client.

BEGIN;

-- 1. Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;

-- 2. Ensure RLS allows access (double check)
-- We previously saw "Enable all for authenticated users", which is good for now.
-- But let's make sure they are enabled.
ALTER TABLE public.inbox_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- 3. Grant access to the `handle_outbound_message` function just in case
GRANT EXECUTE ON FUNCTION public.handle_outbound_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_outbound_message TO service_role;

COMMIT;
