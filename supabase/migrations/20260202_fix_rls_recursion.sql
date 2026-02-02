-- Fix Infinite Recursion in RLS by using a SECURITY DEFINER function

-- 1. Create Helper Function
-- This function runs with the privileges of the creator (postgres/admin), bypassing RLS
CREATE OR REPLACE FUNCTION public.check_is_shop_owner(lookup_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.shop_users 
    WHERE shop_id = lookup_shop_id 
    AND user_id = auth.uid() 
    AND role = 'owner'
  );
END;
$$;

-- 2. Update Policies on shop_users

-- Drop old recursive policies
DROP POLICY IF EXISTS "Owners view shop members" ON public.shop_users;
DROP POLICY IF EXISTS "Owners manage shop members" ON public.shop_users;

-- Re-create using the safe function
CREATE POLICY "Owners view shop members" ON public.shop_users
  FOR SELECT
  TO authenticated
  USING (
    public.check_is_shop_owner(shop_id)
  );

CREATE POLICY "Owners manage shop members" ON public.shop_users
  FOR ALL
  TO authenticated
  USING (
    public.check_is_shop_owner(shop_id)
  );

-- 3. Update Policies on shops
-- (Ensure shop updates also use the safe check)

DROP POLICY IF EXISTS "Shop owners manage shop" ON public.shops;
CREATE POLICY "Shop owners manage shop" ON public.shops
  FOR UPDATE
  TO authenticated
  USING (
    public.check_is_shop_owner(id)
  )
  WITH CHECK (
    public.check_is_shop_owner(id)
  );
