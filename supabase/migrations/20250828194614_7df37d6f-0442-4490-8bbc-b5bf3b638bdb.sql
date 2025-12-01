-- Create storage policies for chat-uploads bucket to allow public access to media files
-- This will allow audio and image files to be accessed publicly

-- Allow public access to view files in chat-uploads bucket
CREATE POLICY "Public can view chat uploads" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-uploads');

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload to their own chat folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own chat files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own chat files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);