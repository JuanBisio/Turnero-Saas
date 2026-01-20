-- Quick test data insertion
-- Run this to populate your shop with test data

-- 1. Insert test professionals
INSERT INTO professionals (shop_id, name, buffer_time_minutes, is_active)
SELECT 
  id as shop_id,
  'María González' as name,
  10 as buffer_time_minutes,
  true as is_active
FROM shops WHERE slug = 'demo'
ON CONFLICT DO NOTHING;

INSERT INTO professionals (shop_id, name, buffer_time_minutes, is_active)
SELECT 
  id as shop_id,
  'Juan Pérez' as name,
  15 as buffer_time_minutes,
  true as is_active
FROM shops WHERE slug = 'demo'
ON CONFLICT DO NOTHING;

-- 2. Get the professional IDs
DO $$
DECLARE
  shop_id_var UUID;
  prof1_id UUID;
  prof2_id UUID;
BEGIN
  -- Get shop ID
  SELECT id INTO shop_id_var FROM shops WHERE slug = 'demo';
  
  -- Get professional IDs
  SELECT id INTO prof1_id FROM professionals WHERE shop_id = shop_id_var AND name = 'María González' LIMIT 1;
  SELECT id INTO prof2_id FROM professionals WHERE shop_id = shop_id_var AND name = 'Leo Messi' LIMIT 1;
  
  -- Insert schedules for María
  INSERT INTO schedules (professional_id, day_of_week, start_time, end_time)
  VALUES 
    (prof1_id, 1, '09:00:00', '13:00:00'),  -- Lunes mañana
    (prof1_id, 1, '15:00:00', '19:00:00'),  -- Lunes tarde
    (prof1_id, 2, '09:00:00', '12:00:00'),  -- Martes
    (prof1_id, 5, '14:00:00', '20:00:00')   -- Viernes
  ON CONFLICT DO NOTHING;
  
  -- Insert schedules for Juan
  INSERT INTO schedules (professional_id, day_of_week, start_time, end_time)
  VALUES 
    (prof2_id, 1, '10:00:00', '18:00:00'),  -- Lunes
    (prof2_id, 3, '10:00:00', '18:00:00'),  -- Miércoles
    (prof2_id, 4, '10:00:00', '18:00:00')   -- Jueves
  ON CONFLICT DO NOTHING;
  
  -- Insert services
  INSERT INTO services (shop_id, name, duration_minutes, price)
  VALUES 
    (shop_id_var, 'Corte de Cabello', 30, 3000),
    (shop_id_var, 'Coloración', 90, 8000),
    (shop_id_var, 'Peinado', 45, 2500)
  ON CONFLICT DO NOTHING;
END $$;

-- Verify data was inserted
SELECT 'Professionals:', COUNT(*) FROM professionals WHERE shop_id = (SELECT id FROM shops WHERE slug = 'demo');
SELECT 'Services:', COUNT(*) FROM services WHERE shop_id = (SELECT id FROM shops WHERE slug = 'demo');
SELECT 'Schedules:', COUNT(*) FROM schedules WHERE professional_id IN (SELECT id FROM professionals WHERE shop_id = (SELECT id FROM shops WHERE slug = 'demo'));
