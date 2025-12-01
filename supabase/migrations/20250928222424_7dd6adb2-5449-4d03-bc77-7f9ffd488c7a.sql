-- Crear tabla separada para embeddings de imágenes de productos
CREATE TABLE public.product_image_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  image_embedding vector(1536),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.product_image_embeddings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view their own product image embeddings" 
ON public.product_image_embeddings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own product image embeddings" 
ON public.product_image_embeddings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product image embeddings" 
ON public.product_image_embeddings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product image embeddings" 
ON public.product_image_embeddings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Índice para búsquedas de similitud
CREATE INDEX product_image_embeddings_embedding_idx ON public.product_image_embeddings 
USING hnsw (image_embedding vector_cosine_ops);

-- Índice para consultas por usuario y producto
CREATE INDEX product_image_embeddings_user_product_idx ON public.product_image_embeddings (user_id, product_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_product_image_embeddings_updated_at
BEFORE UPDATE ON public.product_image_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();