-- Add onboarding fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS country_code VARCHAR(5) DEFAULT '+57',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_current_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_agent_mode TEXT CHECK (ai_agent_mode IN ('advise_only', 'complete_sale')) DEFAULT 'advise_only';

-- Create index for onboarding verification
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding 
ON profiles(user_id, onboarding_completed);

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step
ON profiles(onboarding_current_step, created_at DESC);