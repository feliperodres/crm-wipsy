-- Fix RLS so booking insert + returning works and trigger can mark slot unavailable
-- 1) Allow public SELECT on demo_bookings (required for INSERT ... RETURNING used by PostgREST)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'demo_bookings' AND policyname = 'Public can select bookings'
  ) THEN
    CREATE POLICY "Public can select bookings"
    ON public.demo_bookings
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- 2) Allow UPDATE on demo_time_slots only when there's a booking for that slot
--    This enables the AFTER INSERT trigger to flip is_available to false without opening broad write access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'demo_time_slots' AND policyname = 'Mark slot unavailable when booked'
  ) THEN
    CREATE POLICY "Mark slot unavailable when booked"
    ON public.demo_time_slots
    FOR UPDATE
    USING (
      is_available = true AND EXISTS (
        SELECT 1 FROM public.demo_bookings b WHERE b.time_slot_id = id
      )
    )
    WITH CHECK (
      is_available = true AND EXISTS (
        SELECT 1 FROM public.demo_bookings b WHERE b.time_slot_id = id
      )
    );
  END IF;
END $$;

-- 3) Ensure trigger exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mark_slot_unavailable'
  ) THEN
    CREATE TRIGGER trg_mark_slot_unavailable
    AFTER INSERT ON public.demo_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.mark_slot_unavailable();
  END IF;
END $$;