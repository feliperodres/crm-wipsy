-- Crear buckets para imágenes y audios de chat
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('chat-images', 'chat-images', true),
  ('chat-audios', 'chat-audios', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para chat-images
CREATE POLICY "Usuarios pueden ver imágenes de chat" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-images');

CREATE POLICY "Usuarios autenticados pueden subir imágenes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-images' 
  AND auth.role() = 'service_role'
);

-- Políticas para chat-audios
CREATE POLICY "Usuarios pueden ver audios de chat" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-audios');

CREATE POLICY "Usuarios autenticados pueden subir audios" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-audios' 
  AND auth.role() = 'service_role'
);