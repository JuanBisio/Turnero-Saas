
-- ==============================================================================
-- FIX DEMO ACCESS
-- Run this script in verify that the 'demo' shop exists and you have access to it.
-- ==============================================================================

-- 1. Create 'demo' shop if it doesn't exist
INSERT INTO public.shops (name, slug, timezone)
VALUES ('Peluquería Demo', 'demo', 'America/Argentina/Buenos_Aires')
ON CONFLICT (slug) DO NOTHING;

-- 2. Add YOUR user to the shop (Required for RLS access)
-- REPLACE 'tu_email@ejemplo.com' WITH YOUR ACTUAL LOGIN EMAIL
DO $$
DECLARE
  v_shop_id UUID;
  v_user_email TEXT := 'tu_email@ejemplo.com'; -- <<< IMPORTANT: CHANGE THIS TO YOUR EMAIL
  v_user_id UUID;
BEGIN
  -- Get shop ID
  SELECT id INTO v_shop_id FROM public.shops WHERE slug = 'demo';
  
  -- Get your User ID from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Insert into shop_users
    INSERT INTO public.shop_users (shop_id, user_id, role)
    VALUES (v_shop_id, v_user_id, 'owner')
    ON CONFLICT (shop_id, user_id) DO UPDATE SET role = 'owner';
    
    RAISE NOTICE 'SUCCESS: User % added to shop Demo', v_user_email;
  ELSE
    RAISE NOTICE 'WARNING: User % not found. Please check the email.', v_user_email;
    -- If you are running this in SQL Editor and you are the ONLY user, you might want to try:
    -- SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  END IF;
END $$;

-- 3. Verify
SELECT s.name, s.slug, su.role, u.email 
FROM shops s
JOIN shop_users su ON su.shop_id = s.id
JOIN auth.users u ON u.id = su.user_id
WHERE s.slug = 'demo';
