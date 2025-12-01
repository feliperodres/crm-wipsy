-- Fix RLS policy for demo_bookings to allow public inserts
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.demo_bookings;

CREATE POLICY "Public can insert bookings"
ON public.demo_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);