-- Add new AI agent configuration fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN store_info TEXT,
ADD COLUMN sales_mode TEXT DEFAULT 'advise_only' CHECK (sales_mode IN ('advise_only', 'complete_sale')),
ADD COLUMN payment_accounts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN payment_methods TEXT DEFAULT 'both' CHECK (payment_methods IN ('advance_only', 'on_delivery', 'both'));

-- Add comments to explain the new fields
COMMENT ON COLUMN public.profiles.store_info IS 'Information about the store, products sold, and important details for customers';
COMMENT ON COLUMN public.profiles.sales_mode IS 'Whether AI agent should only advise (advise_only) or complete sales (complete_sale)';
COMMENT ON COLUMN public.profiles.payment_accounts IS 'Array of payment account information for customer transfers';
COMMENT ON COLUMN public.profiles.payment_methods IS 'Payment methods accepted: advance_only, on_delivery, or both';