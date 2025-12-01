-- Add shipping tariff fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_tariff_id TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;

-- Add shipping tariff fields to draft_orders table  
ALTER TABLE public.draft_orders
ADD COLUMN IF NOT EXISTS shipping_tariff_id TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;