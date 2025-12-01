-- Create product variants table for Shopify integration
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Shopify fields
  shopify_id TEXT NULL,
  shopify_product_id TEXT NULL,
  
  -- Variant details
  title TEXT NOT NULL DEFAULT 'Default Title',
  option1 TEXT NULL, -- Size, Color, etc.
  option2 TEXT NULL,
  option3 TEXT NULL,
  
  -- Pricing and inventory
  price NUMERIC NOT NULL,
  compare_at_price NUMERIC NULL,
  cost_per_item NUMERIC NULL,
  
  -- Inventory
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  inventory_management TEXT NULL,
  inventory_policy TEXT DEFAULT 'deny',
  
  -- Physical properties
  weight NUMERIC NULL,
  weight_unit TEXT DEFAULT 'kg',
  
  -- SKU and barcodes
  sku TEXT NULL,
  barcode TEXT NULL,
  
  -- Status
  available BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  position INTEGER NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product variants
CREATE POLICY "Users can view their own product variants" 
ON public.product_variants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own product variants" 
ON public.product_variants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product variants" 
ON public.product_variants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product variants" 
ON public.product_variants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_user_id ON public.product_variants(user_id);
CREATE INDEX idx_product_variants_shopify_id ON public.product_variants(shopify_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants(sku);

-- Add new columns to products table for Shopify integration
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shopify_id TEXT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shopify_handle TEXT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type TEXT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor TEXT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title TEXT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description TEXT NULL;

-- Add indexes for new product fields
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON public.products(shopify_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor);