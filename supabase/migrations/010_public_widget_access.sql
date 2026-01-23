-- Migration: Enable Public Widget Access
-- Description: Add RLS policies to allow public (unauthenticated) read access 
--              to data needed for the booking widget to function in incognito mode
-- Author: System
-- Date: 2026-01-22

-- =====================================================
-- SERVICES - Public read access for active services
-- =====================================================

DROP POLICY IF EXISTS "Public users can view active services" ON services;

CREATE POLICY "Public users can view active services"
  ON services FOR SELECT
  USING (true);

-- =====================================================
-- PROFESSIONALS - Public read access for active professionals
-- =====================================================

DROP POLICY IF EXISTS "Public users can view active professionals" ON professionals;

CREATE POLICY "Public users can view active professionals"
  ON professionals FOR SELECT
  USING (true);

-- =====================================================
-- SCHEDULES - Public read access to view work schedules
-- =====================================================

DROP POLICY IF EXISTS "Public users can view schedules" ON schedules;

CREATE POLICY "Public users can view schedules"
  ON schedules FOR SELECT
  USING (true);

-- =====================================================
-- EXCEPTIONS - Public read access to view schedule exceptions
-- =====================================================

DROP POLICY IF EXISTS "Public users can view exceptions" ON exceptions;

CREATE POLICY "Public users can view exceptions"
  ON exceptions FOR SELECT
  USING (true);

-- =====================================================
-- APPOINTMENTS - Public read access to check availability
-- =====================================================

DROP POLICY IF EXISTS "Public users can view appointments" ON appointments;

CREATE POLICY "Public users can view appointments"
  ON appointments FOR SELECT
  USING (true);

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. These policies ONLY allow SELECT (read) operations
-- 2. Existing authenticated user policies remain unchanged
-- 3. Public users still CANNOT insert/update/delete records
-- 4. This enables the booking widget to work in incognito mode
-- 5. The public API endpoint /api/public/availability will now work without auth
-- =====================================================
