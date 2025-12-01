-- Add payment_status column to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_status text DEFAULT 'pending';

-- Update existing orders with agent source and transfer payment to have pending payment status
UPDATE public.orders 
SET payment_status = 'pending' 
WHERE order_source = 'agent' AND payment_method IN ('transfer', 'transferencia');

-- Update other existing orders to have confirmed payment status
UPDATE public.orders 
SET payment_status = 'confirmed' 
WHERE payment_status = 'pending' AND NOT (order_source = 'agent' AND payment_method IN ('transfer', 'transferencia'));