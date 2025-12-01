-- Add onboarding fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_type text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS monthly_sales text;
