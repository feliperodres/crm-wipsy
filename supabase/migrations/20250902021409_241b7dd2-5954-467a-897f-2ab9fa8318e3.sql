-- Add images column to product_embeddings table
ALTER TABLE public.product_embeddings 
ADD COLUMN images jsonb DEFAULT '[]'::jsonb;