-- Add customer_id column to draft_orders table
ALTER TABLE public.draft_orders 
ADD COLUMN customer_id UUID;

-- Add comment to explain the relationship
COMMENT ON COLUMN public.draft_orders.customer_id IS 'References customers.id to link draft order with existing customer';