-- Enable public read access to webhook_logs for debugging
DROP POLICY IF EXISTS "Public read access" ON public.webhook_logs;
CREATE POLICY "Public read access" ON public.webhook_logs FOR SELECT USING (true);

-- Ensure anon role can select
GRANT SELECT ON public.webhook_logs TO anon;

SELECT 'Log access enabled' as status;
