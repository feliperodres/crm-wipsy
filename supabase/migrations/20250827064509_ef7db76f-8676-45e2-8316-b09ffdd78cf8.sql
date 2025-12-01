-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Create policies for product image uploads
CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Product images are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Users can update their own product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);