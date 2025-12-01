-- Create availability schedule table for recurring weekly hours
CREATE TABLE IF NOT EXISTS public.availability_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Bogota',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.availability_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies for availability schedule
CREATE POLICY "Admins can manage availability schedule"
  ON public.availability_schedule
  FOR ALL
  USING (is_demo_admin())
  WITH CHECK (is_demo_admin());

CREATE POLICY "Anyone can view active availability schedule"
  ON public.availability_schedule
  FOR SELECT
  USING (is_active = true);

-- Add timezone to demo_time_slots for timezone awareness
ALTER TABLE public.demo_time_slots 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Bogota';

-- Add comment
COMMENT ON TABLE public.availability_schedule IS 'Stores recurring weekly availability hours for demo scheduling';