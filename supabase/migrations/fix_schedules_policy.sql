-- Fix Schedules RLS Policy
-- Run this in Supabase SQL Editor

-- 1. Ensure RLS is enabled (safeguard)
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential existing policies to start fresh
DROP POLICY IF EXISTS "Public users can view schedules" ON schedules;
DROP POLICY IF EXISTS "Enable read access for all users" ON schedules;
DROP POLICY IF EXISTS "Public read access" ON schedules;

-- 3. Create the permissive SELECT policy
CREATE POLICY "Public users can view schedules"
ON schedules FOR SELECT
TO public
USING (true);

-- 4. Explicitly grant SELECT permissions to anon role (just in case)
GRANT SELECT ON TABLE schedules TO anon;
GRANT SELECT ON TABLE schedules TO authenticated;

-- Verification query (optional - run this to check)
-- SELECT count(*) FROM schedules;
