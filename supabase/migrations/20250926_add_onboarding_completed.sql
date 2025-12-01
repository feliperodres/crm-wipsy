-- Add onboarding_completed field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Update existing users to have onboarding_completed as false by default
UPDATE public.user_profiles 
SET onboarding_completed = false 
WHERE onboarding_completed IS NULL;
