-- Add unique constraint to user_id in user_subscriptions table
-- This allows the sync function to properly upsert subscriptions

ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);