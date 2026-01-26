-- DIAGNOSTIC SCRIPT: Disable RLS Temporarily
-- Run this to check if the issue is Permissions (RLS) or Missing Data.

BEGIN;

-- 1. Disable RLS on critical tables
ALTER TABLE public.shops DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_users DISABLE ROW LEVEL SECURITY;

COMMIT;

-- AFTER RUNNING THIS:
-- 1. Refresh your Dashboard.
-- 2. If it works: The issue was the RLS Policies (we will fix them next).
-- 3. If it STILL redirects to Onboarding: You have NO DATA (the user-shop link is missing).
