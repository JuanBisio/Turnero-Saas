/*
  Migration: Fix RLS Performance, Security, and Duplicate Policies
  Description: Addresses multiple Supabase warnings regarding RLS performance (init plan),
               duplicate permissive policies, and function security.
  Author: Assistant
  Date: 2026-01-23
*/

BEGIN;

-- =====================================================
-- 1. FIX FUNCTION SECURITY (Search Path) & EXISTENCE
-- =====================================================

-- We recreate 'handle_new_appointment' to ensure it exists and has the correct search_path.
CREATE OR REPLACE FUNCTION public.handle_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_service_name TEXT;
    v_shop_name TEXT;
    -- REPLACE THE URL BELOW WITH YOUR N8N WEBHOOK URL IF NEEDED
    v_n8n_url TEXT := 'https://your-n8n-instance.com/webhook/placeholder'; 
    v_phone TEXT;
    v_payload JSONB;
    v_response_status INTEGER;
    v_response_body TEXT;
    v_error_msg TEXT;
BEGIN
    -- 1. Fetch related data
    SELECT name INTO v_shop_name FROM public.shops WHERE id = NEW.shop_id;
    SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;

    -- 2. Format Phone Number (+54 default for Argentina)
    v_phone := regexp_replace(NEW.customer_phone, '[\s-]', '', 'g');
    
    IF v_phone NOT LIKE '+%' THEN
        v_phone := '+54' || v_phone;
    END IF;

    -- 3. Construct Payload
    v_payload := jsonb_build_object(
        'phone', v_phone,
        'name', NEW.customer_name,
        'service', COALESCE(v_service_name, 'Servicio General'),
        'date', to_char(NEW.start_time::timestamp, 'YYYY-MM-DD'),
        'time', to_char(NEW.start_time::timestamp, 'HH24:MI'),
        'shop_name', COALESCE(v_shop_name, 'Turnero')
    );

    -- 4. Send Webhook (Synchronous capture)
    BEGIN
        SELECT status, content::text INTO v_response_status, v_response_body
        FROM extensions.http((
            'POST',
            v_n8n_url,
            ARRAY[extensions.http_header('Content-Type', 'application/json')],
            'application/json',
            v_payload::text
        )::extensions.http_request);

        -- 5. Log Success/Response
        INSERT INTO public.webhook_logs (appointment_id, payload, status, response_body)
        VALUES (NEW.id, v_payload, v_response_status, v_response_body);
        
    EXCEPTION WHEN OTHERS THEN
        -- 6. Log Failure
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        INSERT INTO public.webhook_logs (appointment_id, payload, status, error_message)
        VALUES (NEW.id, v_payload, 500, v_error_msg);
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions;

-- Attempt to fix 'notify_appointment_webhook' if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_appointment_webhook') THEN
        ALTER FUNCTION public.notify_appointment_webhook() SET search_path = public, extensions;
    END IF;
END $$;

-- =====================================================
-- 2. FIX RLS & DUPLICATE POLICIES
-- =====================================================

-- TABLE: appointments
DROP POLICY IF EXISTS "Admins can manage their own shop data" ON appointments;
DROP POLICY IF EXISTS "Public can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Users can manage appointments from their shops" ON appointments;
DROP POLICY IF EXISTS "Users can view appointments from their shops" ON appointments;
DROP POLICY IF EXISTS "Public users can view appointments" ON appointments;

-- Unified SELECT (Public + Auth)
CREATE POLICY "Public users can view appointments"
  ON appointments FOR SELECT TO public
  USING (true);

-- Auth can MANAGE (Insert/Update/Delete)
CREATE POLICY "Users can manage appointments from their shops"
  ON appointments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = appointments.shop_id
        AND shop_users.user_id = (select auth.uid())
        AND shop_users.role IN ('owner', 'admin', 'receptionist')
    )
  );

-- Explicit Insert for Anon (if needed per original warnings)
CREATE POLICY "Public can insert appointments"
  ON appointments FOR INSERT TO anon
  WITH CHECK (true);


-- TABLE: shops
DROP POLICY IF EXISTS "Users can view shops they belong to" ON shops;
DROP POLICY IF EXISTS "Public shops access" ON shops;
DROP POLICY IF EXISTS "Authenticated users can create shops" ON shops;

-- Unified SELECT (Public + Auth)
-- Allows everyone (including logged in users) to see shops.
CREATE POLICY "Public shops access"
  ON shops FOR SELECT TO public
  USING (true);

-- Auth can INSERT/MANAGE
CREATE POLICY "Authenticated users can create shops"
  ON shops FOR INSERT TO authenticated
  WITH CHECK (true);


-- TABLE: shop_users
DROP POLICY IF EXISTS "Users can view their own shop memberships" ON shop_users;
DROP POLICY IF EXISTS "Users can manage their own memberships" ON shop_users;
DROP POLICY IF EXISTS "Authenticated users can view all shop memberships" ON shop_users;
DROP POLICY IF EXISTS "Users can create first shop membership" ON shop_users;
DROP POLICY IF EXISTS "Owners can manage shop users" ON shop_users;

-- Strict visibility for shop_users (Personal data)
-- NOT making this public!
CREATE POLICY "Users can view their own shop memberships"
  ON shop_users FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create first shop membership"
  ON shop_users FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id 
    AND role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_id = shop_users.shop_id
    )
  );

CREATE POLICY "Owners can manage shop users"
  ON shop_users FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shop_users su
      WHERE su.shop_id = shop_users.shop_id
        AND su.user_id = (select auth.uid())
        AND su.role = 'owner'
    )
  );


-- TABLE: professionals
DROP POLICY IF EXISTS "Users can view professionals from their shops" ON professionals;
DROP POLICY IF EXISTS "Users can manage professionals from their shops" ON professionals;
DROP POLICY IF EXISTS "Public professionals access" ON professionals;
DROP POLICY IF EXISTS "Public users can view active professionals" ON professionals;

-- Unified SELECT
CREATE POLICY "Public users can view active professionals"
  ON professionals FOR SELECT TO public
  USING (true);

-- Auth MANAGE
CREATE POLICY "Users can manage professionals from their shops"
  ON professionals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = professionals.shop_id
        AND shop_users.user_id = (select auth.uid())
        AND shop_users.role IN ('owner', 'admin')
    )
  );


-- TABLE: services
DROP POLICY IF EXISTS "Users can view services from their shops" ON services;
DROP POLICY IF EXISTS "Users can manage services from their shops" ON services;
DROP POLICY IF EXISTS "Public services access" ON services;
DROP POLICY IF EXISTS "Public users can view active services" ON services;

-- Unified SELECT
CREATE POLICY "Public users can view active services"
  ON services FOR SELECT TO public
  USING (true);

-- Auth MANAGE
CREATE POLICY "Users can manage services from their shops"
  ON services FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shop_users
      WHERE shop_users.shop_id = services.shop_id
        AND shop_users.user_id = (select auth.uid())
        AND shop_users.role IN ('owner', 'admin')
    )
  );


-- TABLE: schedules
DROP POLICY IF EXISTS "Users can view schedules from their shops" ON schedules;
DROP POLICY IF EXISTS "Users can manage schedules from their shops" ON schedules;
DROP POLICY IF EXISTS "Public users can view schedules" ON schedules;

-- Unified SELECT
CREATE POLICY "Public users can view schedules"
  ON schedules FOR SELECT TO public
  USING (true);

-- Auth MANAGE
CREATE POLICY "Users can manage schedules from their shops"
  ON schedules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN shop_users su ON su.shop_id = p.shop_id
      WHERE p.id = schedules.professional_id
        AND su.user_id = (select auth.uid())
        AND su.role IN ('owner', 'admin')
    )
  );


-- TABLE: exceptions
DROP POLICY IF EXISTS "Users can view exceptions from their shops" ON exceptions;
DROP POLICY IF EXISTS "Users can manage exceptions from their shops" ON exceptions;
DROP POLICY IF EXISTS "Public users can view exceptions" ON exceptions;

-- Unified SELECT
CREATE POLICY "Public users can view exceptions"
  ON exceptions FOR SELECT TO public
  USING (true);

-- Auth MANAGE
CREATE POLICY "Users can manage exceptions from their shops"
  ON exceptions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN shop_users su ON su.shop_id = p.shop_id
      WHERE p.id = exceptions.professional_id
        AND su.user_id = (select auth.uid())
        AND su.role IN ('owner', 'admin')
    )
  );


-- TABLE: webhook_logs
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON webhook_logs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON webhook_logs;
DROP POLICY IF EXISTS "Public read access" ON webhook_logs;

-- Keeping logs private to authenticated usually safer, but warning said "Public read access" existed.
-- Given it's logs, we'll assume dashboard needs it.
CREATE POLICY "Enable read access for authenticated users"
  ON webhook_logs FOR SELECT TO authenticated
  USING (true);

COMMIT;
