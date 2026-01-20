-- Add RLS policies for professionals and services
-- These were missing and causing loading issues

-- Professionals RLS
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view professionals from their shops" ON professionals;

CREATE POLICY "Users can view professionals from their shops"
  ON professionals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = professionals.shop_id
        AND shop_users.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage professionals from their shops" ON professionals;

CREATE POLICY "Users can manage professionals from their shops"
  ON professionals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = professionals.shop_id
        AND shop_users.user_id = auth.uid()
        AND shop_users.role IN ('owner', 'admin')
    )
  );

-- Services RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view services from their shops" ON services;

CREATE POLICY "Users can view services from their shops"
  ON services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = services.shop_id
        AND shop_users.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage services from their shops" ON services;

CREATE POLICY "Users can manage services from their shops"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = services.shop_id
        AND shop_users.user_id = auth.uid()
        AND shop_users.role IN ('owner', 'admin')
    )
  );

-- Schedules RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view schedules from their shops" ON schedules;

CREATE POLICY "Users can view schedules from their shops"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN shop_users su ON su.shop_id = p.shop_id
      WHERE p.id = schedules.professional_id
        AND su.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage schedules from their shops" ON schedules;

CREATE POLICY "Users can manage schedules from their shops"
  ON schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN shop_users su ON su.shop_id = p.shop_id
      WHERE p.id = schedules.professional_id
        AND su.user_id = auth.uid()
        AND su.role IN ('owner', 'admin')
    )
  );

-- Appointments RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view appointments from their shops" ON appointments;

CREATE POLICY "Users can view appointments from their shops"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = appointments.shop_id
        AND shop_users.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage appointments from their shops" ON appointments;

CREATE POLICY "Users can manage appointments from their shops"
  ON appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = appointments.shop_id
        AND shop_users.user_id = auth.uid()
        AND shop_users.role IN ('owner', 'admin', 'receptionist')
    )
  );

-- Exceptions RLS
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view exceptions from their shops" ON exceptions;

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

DROP POLICY IF EXISTS "Users can manage exceptions from their shops" ON exceptions;

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
