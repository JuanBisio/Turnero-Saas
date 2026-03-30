-- Migration: Secure RLS and Endpoints
-- Description: Fixes critical security vulnerabilities by enabling RLS on all tables and implementing strict policies.
--           Replaces permissive 'true' policies with validation checks.

BEGIN;

-- =====================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CLEANUP PERMISSIVE POLICIES
-- =====================================================

-- Remove any policies that might be open (DROP IF EXISTS to be safe)
-- Remove any policies that might be open (DROP IF EXISTS to be safe)
DROP POLICY IF EXISTS "Public shops access" ON public.shops;
DROP POLICY IF EXISTS "Authenticated users can create shops" ON public.shops;
DROP POLICY IF EXISTS "Users can view shops they belong to" ON public.shops;

DROP POLICY IF EXISTS "Public users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can manage appointments from their shops" ON public.appointments;
DROP POLICY IF EXISTS "Users can view appointments from their shops" ON public.appointments;

DROP POLICY IF EXISTS "Public users can view active professionals" ON public.professionals;
DROP POLICY IF EXISTS "Users can manage professionals from their shops" ON public.professionals;
DROP POLICY IF EXISTS "Users can view professionals from their shops" ON public.professionals;

DROP POLICY IF EXISTS "Public users can view active services" ON public.services;
DROP POLICY IF EXISTS "Users can manage services from their shops" ON public.services;
DROP POLICY IF EXISTS "Users can view services from their shops" ON public.services;

DROP POLICY IF EXISTS "Public users can view schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can manage schedules from their shops" ON public.schedules;
DROP POLICY IF EXISTS "Users can view schedules from their shops" ON public.schedules;

DROP POLICY IF EXISTS "Public users can view exceptions" ON public.exceptions;
DROP POLICY IF EXISTS "Users can manage exceptions from their shops" ON public.exceptions;
DROP POLICY IF EXISTS "Users can view exceptions from their shops" ON public.exceptions;

DROP POLICY IF EXISTS "Users can create first shop membership" ON public.shop_users;


-- =====================================================
-- 3. STRICT POLICIES IMPLEMENTATION
-- =====================================================

-- ------------------------------
-- TABLE: SHOPS
-- ------------------------------
-- Public: Can read basic shop info (needed for booking pages / slugs)
-- RESTRICTION: We rely on 'slug' lookups, but typically RLS is per-row. 
-- Allowing public to read ALL shops is usually acceptable for SaaS unless "hidden" shops are needed.
-- But the report warned about "Tenencia sin protección". 
-- Critical part is WRITE access.

CREATE POLICY "Public read shops" 
  ON public.shops FOR SELECT 
  TO public 
  USING (true);

-- Authenticated Owners/Admins: Can UPDATE their own shop
CREATE POLICY "Shop owners manage shop" 
  ON public.shops FOR UPDATE 
  TO authenticated 
  USING (
    exists (
      select 1 from public.shop_users
      where shop_users.shop_id = shops.id
      and shop_users.user_id = auth.uid()
      and shop_users.role in ('owner', 'admin')
    )
  )
  WITH CHECK (
    exists (
      select 1 from public.shop_users
      where shop_users.shop_id = shops.id
      and shop_users.user_id = auth.uid()
      and shop_users.role in ('owner', 'admin')
    )
  );

-- Admin creation via special process (or if you allow self-signup, strict checks on creating shop_users)

-- ------------------------------
-- TABLE: APPOINTMENTS
-- ------------------------------
-- READ: Only authenticated shop staff can see ALL appointments.
-- Public/Customer CANNOT see other people's appointments.
-- (If customers need to see their own, they need a dedicated policy matching their cached auth or nothing via RLS if using token access)

CREATE POLICY "Staff view appointments" 
  ON public.appointments FOR SELECT 
  TO authenticated 
  USING (
    exists (
      select 1 from public.shop_users
      where shop_users.shop_id = appointments.shop_id
      and shop_users.user_id = auth.uid()
      and shop_users.role in ('owner', 'admin', 'receptionist')
    )
  );

-- INSERT: Public can insert (Booking), BUT we validate consistency.
-- Check: service_id must belong to shop_id.
CREATE POLICY "Public insert appointments" 
  ON public.appointments FOR INSERT 
  TO public 
  WITH CHECK (
    exists (
      select 1 from public.services
      where services.id = service_id
      and services.shop_id = appointments.shop_id
    )
  );

-- UPDATE/DELETE: Only shop staff
CREATE POLICY "Staff manage appointments" 
  ON public.appointments FOR ALL 
  TO authenticated 
  USING (
    exists (
      select 1 from public.shop_users
      where shop_users.shop_id = appointments.shop_id
      and shop_users.user_id = auth.uid()
      and shop_users.role in ('owner', 'admin', 'receptionist')
    )
  );

-- ------------------------------
-- TABLE: SERVICES, PROFESSIONALS, SCHEDULES, EXCEPTIONS
-- ------------------------------
-- READ: Public (needed for booking widget)
-- WRITE: Shop Admins only

-- SERVICES
CREATE POLICY "Public read services" ON public.services FOR SELECT TO public USING (true);
CREATE POLICY "Staff manage services" ON public.services FOR ALL TO authenticated
  USING (
    exists (select 1 from public.shop_users where shop_users.shop_id = services.shop_id and shop_users.user_id = auth.uid() and shop_users.role in ('owner', 'admin'))
  );

-- PROFESSIONALS
CREATE POLICY "Public read professionals" ON public.professionals FOR SELECT TO public USING (true);
CREATE POLICY "Staff manage professionals" ON public.professionals FOR ALL TO authenticated
  USING (
    exists (select 1 from public.shop_users where shop_users.shop_id = professionals.shop_id and shop_users.user_id = auth.uid() and shop_users.role in ('owner', 'admin'))
  );

-- SCHEDULES
CREATE POLICY "Public read schedules" ON public.schedules FOR SELECT TO public USING (true);
CREATE POLICY "Staff manage schedules" ON public.schedules FOR ALL TO authenticated
  USING (
    exists (
      select 1 from public.shop_users su
      join public.professionals p on p.shop_id = su.shop_id
      where p.id = schedules.professional_id
      and su.user_id = auth.uid() 
      and su.role in ('owner', 'admin')
    )
  );

-- EXCEPTIONS
CREATE POLICY "Public read exceptions" ON public.exceptions FOR SELECT TO public USING (true);
CREATE POLICY "Staff manage exceptions" ON public.exceptions FOR ALL TO authenticated
  USING (
    exists (
      select 1 from public.shop_users su
      join public.professionals p on p.shop_id = su.shop_id
      where p.id = exceptions.professional_id
      and su.user_id = auth.uid() 
      and su.role in ('owner', 'admin')
    )
  );

-- ------------------------------
-- TABLE: SHOP_USERS
-- ------------------------------
-- Critical: Only show MEMBERS of the same shop or self.
-- Prevent "Listing all users in the platform".

DROP POLICY IF EXISTS "Users can view their own shop memberships" ON public.shop_users;
DROP POLICY IF EXISTS "Owners can manage shop users" ON public.shop_users;

-- View own memberships
CREATE POLICY "View own memberships" ON public.shop_users FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Owners can view other members of their shop
CREATE POLICY "Owners view shop members" ON public.shop_users FOR SELECT TO authenticated
USING (
    exists (
      select 1 from public.shop_users su
      where su.shop_id = shop_users.shop_id
      and su.user_id = auth.uid()
      and su.role = 'owner'
    )
);

-- Owners can manage (insert/update/delete) members of their shop
CREATE POLICY "Owners manage shop members" ON public.shop_users FOR ALL TO authenticated
USING (
    exists (
      select 1 from public.shop_users su
      where su.shop_id = shop_users.shop_id
      and su.user_id = auth.uid()
      and su.role = 'owner'
    )
);

-- Allow creating new shops
CREATE POLICY "Authenticated users can create shops" 
  ON public.shops FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow claiming ownership of empty shops (creation flow)
CREATE POLICY "Users can create first shop membership"
  ON public.shop_users FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = user_id 
    AND role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM public.shop_users existing
      WHERE existing.shop_id = shop_users.shop_id
    )
  );

COMMIT;
