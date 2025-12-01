-- Allow trigger/internal updates on demo_time_slots (no JWT context)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='demo_time_slots' 
      AND policyname='Trigger can update slots (no JWT)'
  ) THEN
    CREATE POLICY "Trigger can update slots (no JWT)"
    ON public.demo_time_slots
    FOR UPDATE
    USING ((current_setting('request.jwt.claims', true)) IS NULL)
    WITH CHECK ((current_setting('request.jwt.claims', true)) IS NULL);
  END IF;
END $$;

-- Ensure trigger exists to mark slot unavailable after booking insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_booking_mark_unavailable'
  ) THEN
    CREATE TRIGGER trg_booking_mark_unavailable
    AFTER INSERT ON public.demo_bookings
    FOR EACH ROW EXECUTE FUNCTION public.mark_slot_unavailable();
  END IF;
END $$;