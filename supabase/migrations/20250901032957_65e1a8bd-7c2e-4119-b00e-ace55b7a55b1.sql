-- Create bucket for store assets (logos and banners)
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true);

-- Create RLS policies for store assets bucket
CREATE POLICY "Users can upload their own store assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own store assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own store assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own store assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'store-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to store assets for store viewing
CREATE POLICY "Store assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'store-assets');