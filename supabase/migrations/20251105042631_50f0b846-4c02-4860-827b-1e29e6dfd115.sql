-- Fix incorrect outer reference in policy (qualifying demo_time_slots.id)
DROP POLICY IF EXISTS "Mark slot unavailable when booked" ON public.demo_time_slots;

CREATE POLICY "Mark slot unavailable when booked"
ON public.demo_time_slots
FOR UPDATE
USING (
  is_available = true AND EXISTS (
    SELECT 1 FROM public.demo_bookings b WHERE b.time_slot_id = public.demo_time_slots.id
  )
)
WITH CHECK (
  is_available = true AND EXISTS (
    SELECT 1 FROM public.demo_bookings b WHERE b.time_slot_id = public.demo_time_slots.id
  )
);