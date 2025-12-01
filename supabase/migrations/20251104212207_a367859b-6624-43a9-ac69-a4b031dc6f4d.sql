-- Add unique constraint to demo_time_slots.start_time
ALTER TABLE public.demo_time_slots
ADD CONSTRAINT demo_time_slots_start_time_key UNIQUE (start_time);