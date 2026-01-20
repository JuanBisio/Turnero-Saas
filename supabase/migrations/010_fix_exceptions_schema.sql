-- Fix exceptions table schema
-- The previous schema used TIME which caused issues with date-specific blocking
-- We will recreate the table with TIMESTAMP columns

DROP TABLE IF EXISTS exceptions;

CREATE TABLE exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  reason TEXT DEFAULT 'Bloqueo manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Re-enable RLS
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;

-- Re-create policies (copied from 007_rls_all_tables.sql)
CREATE POLICY "Users can view exceptions from their shops"
  ON exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN shop_users su ON su.shop_id = p.shop_id
      WHERE p.id = exceptions.professional_id
        AND su.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage exceptions from their shops"
  ON exceptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN shop_users su ON su.shop_id = p.shop_id
      WHERE p.id = exceptions.professional_id
        AND su.user_id = auth.uid()
        AND su.role IN ('owner', 'admin')
    )
  );
