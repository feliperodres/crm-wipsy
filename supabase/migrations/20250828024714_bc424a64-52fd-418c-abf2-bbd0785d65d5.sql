-- Remove AI agent configuration fields from customers table and add to profiles
ALTER TABLE public.customers 
DROP COLUMN ai_agent_role,
DROP COLUMN ai_agent_objective;

-- Add AI agent configuration to profiles table
ALTER TABLE public.profiles 
ADD COLUMN ai_agent_role TEXT DEFAULT '',
ADD COLUMN ai_agent_objective TEXT DEFAULT '';