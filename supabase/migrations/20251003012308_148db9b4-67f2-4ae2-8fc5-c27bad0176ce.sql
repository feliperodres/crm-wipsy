-- Add column to control if AI agent should be disabled when business responds manually
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS disable_agent_on_manual_reply boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.disable_agent_on_manual_reply IS 'When true, the AI agent will be automatically disabled when business sends a manual message to a customer';