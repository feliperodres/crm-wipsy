-- Primero, corregir todos los slots que tienen bookings pero siguen marcados como disponibles
UPDATE public.demo_time_slots ts
SET is_available = false
WHERE EXISTS (
  SELECT 1 FROM public.demo_bookings b WHERE b.time_slot_id = ts.id
) AND ts.is_available = true;

-- Verificar que la función slot_has_booking existe y funciona correctamente
-- Ya existe, pero vamos a asegurarnos de que la política RLS sea más estricta

-- Eliminar la política actual y recrearla de forma más robusta
DROP POLICY IF EXISTS "Anyone can view available (not booked) time slots" ON public.demo_time_slots;

-- Crear política que solo muestra slots disponibles Y sin bookings Y en el futuro
CREATE POLICY "Anyone can view truly available time slots"
ON public.demo_time_slots
FOR SELECT
USING (
  is_available = true 
  AND NOT EXISTS (
    SELECT 1 FROM public.demo_bookings b WHERE b.time_slot_id = demo_time_slots.id
  )
  AND start_time >= now()
);