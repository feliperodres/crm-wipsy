-- Add order_source column to orders table to distinguish order origins
ALTER TABLE public.orders 
ADD COLUMN order_source text DEFAULT 'manual' CHECK (order_source IN ('manual', 'agent', 'store', 'shopify'));

-- Update existing orders based on patterns
UPDATE public.orders 
SET order_source = 'manual' 
WHERE order_source IS NULL;

-- Add index for better performance
CREATE INDEX idx_orders_order_source ON public.orders(order_source);