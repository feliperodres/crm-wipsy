-- Fix RLS policy logic error on demo_time_slots
-- The issue: policy requires booking to exist BEFORE it can update the slot
-- Solution: Remove the circular dependency - allow UPDATE when slot is available

DROP POLICY IF EXISTS "Mark slot unavailable when booked" ON public.demo_time_slots;

-- Allow UPDATE on demo_time_slots for slots that are currently available
-- The trigger will handle marking them unavailable AFTER booking is created
CREATE POLICY "Allow update available slots"
ON public.demo_time_slots
FOR UPDATE
USING (is_available = true)
WITH CHECK (true);

-- Ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION public.mark_slot_unavailable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark the time slot as unavailable
  UPDATE public.demo_time_slots
  SET is_available = false
  WHERE id = NEW.time_slot_id;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS trg_mark_slot_unavailable ON public.demo_bookings;

CREATE TRIGGER trg_mark_slot_unavailable
AFTER INSERT ON public.demo_bookings
FOR EACH ROW
EXECUTE FUNCTION public.mark_slot_unavailable();