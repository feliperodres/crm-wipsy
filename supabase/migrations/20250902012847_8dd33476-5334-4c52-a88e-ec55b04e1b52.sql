-- Habilitar la extensión pgvector para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Crear tabla para embeddings de productos
CREATE TABLE public.product_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  category TEXT,
  price NUMERIC,
  stock INTEGER,
  variants JSONB DEFAULT '[]'::jsonb,
  embedding vector(1536), -- OpenAI ada-002 tiene 1536 dimensiones
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.product_embeddings ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Users can view their own product embeddings" 
ON public.product_embeddings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own product embeddings" 
ON public.product_embeddings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product embeddings" 
ON public.product_embeddings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product embeddings" 
ON public.product_embeddings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Crear índice para búsquedas vectoriales más rápidas
CREATE INDEX product_embeddings_vector_idx ON public.product_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Crear índices adicionales
CREATE INDEX product_embeddings_user_id_idx ON public.product_embeddings(user_id);
CREATE INDEX product_embeddings_product_id_idx ON public.product_embeddings(product_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_product_embeddings_updated_at
BEFORE UPDATE ON public.product_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para búsquedas semánticas
CREATE OR REPLACE FUNCTION public.search_products_by_similarity(
  target_user_id UUID,
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  product_description TEXT,
  category TEXT,
  price NUMERIC,
  stock INTEGER,
  variants JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.product_id,
    pe.product_name,
    pe.product_description,
    pe.category,
    pe.price,
    pe.stock,
    pe.variants,
    1 - (pe.embedding <=> query_embedding) as similarity
  FROM public.product_embeddings pe
  WHERE pe.user_id = target_user_id
    AND 1 - (pe.embedding <=> query_embedding) > similarity_threshold
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;