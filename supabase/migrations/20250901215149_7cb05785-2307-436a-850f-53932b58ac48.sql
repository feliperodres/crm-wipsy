-- Add webhook tracking columns to shopify_integrations table
ALTER TABLE public.shopify_integrations 
ADD COLUMN IF NOT EXISTS webhook_id_orders text,
ADD COLUMN IF NOT EXISTS webhook_id_products text,
ADD COLUMN IF NOT EXISTS webhook_configured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_orders_url text,
ADD COLUMN IF NOT EXISTS webhook_products_url text;