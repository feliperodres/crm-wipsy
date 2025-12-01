-- Add customer_id column to shopify_orders table to link with customers
ALTER TABLE public.shopify_orders 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);