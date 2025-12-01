-- Add AI agent enabled field to customers table
ALTER TABLE public.customers 
ADD COLUMN ai_agent_enabled BOOLEAN NOT NULL DEFAULT false;