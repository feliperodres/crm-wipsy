-- Create storage bucket for chat uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', true);

-- Create policies for chat uploads
CREATE POLICY "Users can upload their own chat images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can view their own chat images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Chat images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-uploads');