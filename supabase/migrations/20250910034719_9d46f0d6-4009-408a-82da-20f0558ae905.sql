-- Add new columns for customer management settings
ALTER TABLE public.profiles 
ADD COLUMN new_customer_agent_enabled BOOLEAN DEFAULT true,
ADD COLUMN auto_reactivation_hours INTEGER DEFAULT 24;