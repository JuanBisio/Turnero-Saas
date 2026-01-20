-- Migration: Allow Authenticated Users to Create Shops
-- Description: Adds RLS policies to allow creation of shops and becoming the first owner.

-- 1. Allow any authenticated user to INSERT into shops
CREATE POLICY "Authenticated users can create shops"
  ON shops
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Allow users to insert themselves into shop_users IF they are claiming ownership of a fresh shop
-- Meaning: They can insert if they are the user_id, role is 'owner', and no one else is in that shop yet.
CREATE POLICY "Users can create first shop membership"
  ON shop_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM shop_users WHERE shop_id = shop_users.shop_id
    )
  );
