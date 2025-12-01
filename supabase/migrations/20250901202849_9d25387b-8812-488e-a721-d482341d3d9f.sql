-- Create shopify_orders table for storing imported orders
CREATE TABLE IF NOT EXISTS public.shopify_orders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_domain TEXT NOT NULL,
  order_number TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_price DECIMAL(10,2),
  subtotal_price DECIMAL(10,2),
  total_tax DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  financial_status TEXT,
  fulfillment_status TEXT,
  customer_data JSONB,
  line_items JSONB,
  shipping_address JSONB,
  billing_address JSONB,
  raw_data JSONB,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shopify_products table for storing imported products
CREATE TABLE IF NOT EXISTS public.shopify_products (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_domain TEXT NOT NULL,
  title TEXT NOT NULL,
  handle TEXT,
  description TEXT,
  vendor TEXT,
  product_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  tags TEXT[],
  images JSONB,
  variants JSONB,
  raw_data JSONB,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shopify_orders
CREATE POLICY "Users can view their own Shopify orders" 
ON public.shopify_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Shopify orders" 
ON public.shopify_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Shopify orders" 
ON public.shopify_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Shopify orders" 
ON public.shopify_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for shopify_products
CREATE POLICY "Users can view their own Shopify products" 
ON public.shopify_products 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Shopify products" 
ON public.shopify_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Shopify products" 
ON public.shopify_products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Shopify products" 
ON public.shopify_products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_user_id ON public.shopify_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shop_domain ON public.shopify_orders(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_at ON public.shopify_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_shopify_products_user_id ON public.shopify_products(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_shop_domain ON public.shopify_products(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_products_status ON public.shopify_products(status);