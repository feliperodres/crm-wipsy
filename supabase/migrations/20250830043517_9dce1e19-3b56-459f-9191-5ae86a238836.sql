-- Add new fields to customers table for complete address information
ALTER TABLE public.customers 
ADD COLUMN last_name TEXT,
ADD COLUMN address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN province TEXT;

-- Add payment method to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_method TEXT CHECK (payment_method IN ('Pago Contra Entrega', 'Anticipado'));

-- Update order status to use specific values
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check,
ADD CONSTRAINT orders_status_check CHECK (status IN ('pendiente', 'preparado', 'entregado', 'cancelado'));