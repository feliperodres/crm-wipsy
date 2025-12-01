-- Create table for draft orders that AI agent collects
CREATE TABLE public.draft_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    customer_name TEXT NOT NULL,
    customer_last_name TEXT,
    customer_address TEXT,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'collecting'::text,
    chat_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.draft_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own draft orders" 
ON public.draft_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own draft orders" 
ON public.draft_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft orders" 
ON public.draft_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own draft orders" 
ON public.draft_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_draft_orders_updated_at
BEFORE UPDATE ON public.draft_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to describe the table
COMMENT ON TABLE public.draft_orders IS 'Stores preliminary order data collected by AI agent before creating final orders';
COMMENT ON COLUMN public.draft_orders.products IS 'Array of products in format [{"id":"REF001","nombre":"Product Name","cantidad":1}]';
COMMENT ON COLUMN public.draft_orders.status IS 'Status: collecting, ready, processed, error';