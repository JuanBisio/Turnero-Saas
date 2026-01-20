-- Sprint 1 Phase A: Authentication
-- Migration to add user management

-- Create shop_users junction table (many-to-many)
CREATE TABLE IF NOT EXISTS shop_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin', -- 'owner', 'admin', 'receptionist'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shop_users_shop_id ON shop_users(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_users_user_id ON shop_users(user_id);

-- RLS Policies for shop_users
ALTER TABLE shop_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own shop memberships" ON shop_users;
DROP POLICY IF EXISTS "Owners can manage shop users" ON shop_users;
DROP POLICY IF EXISTS "Users can view shops they belong to" ON shops;

-- Users can see shops they belong to
CREATE POLICY "Users can view their own shop memberships"
  ON shop_users FOR SELECT
  USING (auth.uid() = user_id);

-- Owners can manage shop_users
CREATE POLICY "Owners can manage shop users"
  ON shop_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shop_users su
      WHERE su.shop_id = shop_users.shop_id
        AND su.user_id = auth.uid()
        AND su.role = 'owner'
    )
  );

-- Update shops RLS to check shop_users
CREATE POLICY "Users can view shops they belong to"
  ON shops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = shops.id
        AND shop_users.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE shop_users IS 'Many-to-many relationship between users and shops';
COMMENT ON COLUMN shop_users.role IS 'User role: owner, admin, or receptionist';
