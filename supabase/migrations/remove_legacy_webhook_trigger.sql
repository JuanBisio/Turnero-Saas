
-- Drop the trigger and function that were hardcoded
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
DROP FUNCTION IF EXISTS public.handle_new_appointment();
