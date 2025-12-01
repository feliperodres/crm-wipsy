-- Function to check if a time slot already has a booking (used in RLS policy)
CREATE OR REPLACE FUNCTION public.slot_has_booking(slot_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_bookings b WHERE b.time_slot_id = slot_id
  );
$$;

-- Replace public SELECT policy on demo_time_slots to hide booked slots
DROP POLICY IF EXISTS "Anyone can view available time slots" ON public.demo_time_slots;
CREATE POLICY "Anyone can view available (not booked) time slots"
ON public.demo_time_slots
FOR SELECT
USING ((is_available = true) AND (NOT public.slot_has_booking(id)));

-- Automatically mark a slot as unavailable when a booking is created
CREATE OR REPLACE FUNCTION public.mark_slot_unavailable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.demo_time_slots
  SET is_available = false
  WHERE id = NEW.time_slot_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_slot_unavailable ON public.demo_bookings;
CREATE TRIGGER trg_mark_slot_unavailable
AFTER INSERT ON public.demo_bookings
FOR EACH ROW
EXECUTE FUNCTION public.mark_slot_unavailable();
