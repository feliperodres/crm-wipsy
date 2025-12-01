-- Create table for demo questionnaire responses
CREATE TABLE IF NOT EXISTS public.demo_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_size TEXT NOT NULL,
  product_type TEXT NOT NULL,
  product_count TEXT NOT NULL,
  country TEXT NOT NULL,
  industry TEXT NOT NULL,
  messages_per_month TEXT NOT NULL,
  monthly_sales TEXT NOT NULL,
  platform TEXT NOT NULL,
  main_channel TEXT NOT NULL,
  main_challenge TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for demo time slots
CREATE TABLE IF NOT EXISTS public.demo_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for demo bookings
CREATE TABLE IF NOT EXISTS public.demo_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_response_id UUID REFERENCES public.demo_questionnaire_responses(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES public.demo_time_slots(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(time_slot_id)
);

-- Enable RLS
ALTER TABLE public.demo_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_bookings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin (based on email)
CREATE OR REPLACE FUNCTION is_demo_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() ->> 'email' IN ('felipe.rodres@gmail.com', 'admin@wipsy.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for demo_questionnaire_responses
CREATE POLICY "Anyone can insert questionnaire responses"
  ON public.demo_questionnaire_responses
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all questionnaire responses"
  ON public.demo_questionnaire_responses
  FOR SELECT
  USING (is_demo_admin());

-- Policies for demo_time_slots
CREATE POLICY "Anyone can view available time slots"
  ON public.demo_time_slots
  FOR SELECT
  USING (is_available = true);

CREATE POLICY "Admins can manage time slots"
  ON public.demo_time_slots
  FOR ALL
  USING (is_demo_admin());

-- Policies for demo_bookings
CREATE POLICY "Anyone can insert bookings"
  ON public.demo_bookings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all bookings"
  ON public.demo_bookings
  FOR SELECT
  USING (is_demo_admin());

CREATE POLICY "Admins can update bookings"
  ON public.demo_bookings
  FOR UPDATE
  USING (is_demo_admin());

-- Create index for better query performance
CREATE INDEX idx_demo_bookings_time_slot ON public.demo_bookings(time_slot_id);
CREATE INDEX idx_demo_time_slots_available ON public.demo_time_slots(is_available, start_time);
CREATE INDEX idx_demo_questionnaire_created ON public.demo_questionnaire_responses(created_at DESC);