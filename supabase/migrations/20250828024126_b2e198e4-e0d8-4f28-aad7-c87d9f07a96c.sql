-- Add AI agent configuration fields to customers table
ALTER TABLE public.customers 
ADD COLUMN ai_agent_role TEXT DEFAULT '',
ADD COLUMN ai_agent_objective TEXT DEFAULT '';