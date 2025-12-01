-- Add shipping configuration to store_settings table
ALTER TABLE public.store_settings 
ADD COLUMN shipping_rates jsonb DEFAULT '[]'::jsonb;