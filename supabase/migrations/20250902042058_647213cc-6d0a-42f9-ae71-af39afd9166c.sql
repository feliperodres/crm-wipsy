-- Eliminar duplicados en product_embeddings manteniendo el más reciente
DELETE FROM public.product_embeddings 
WHERE id NOT IN (
  SELECT DISTINCT ON (product_id, user_id) id 
  FROM public.product_embeddings 
  ORDER BY product_id, user_id, created_at DESC
);

-- Ahora crear el índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_embeddings_unique 
ON public.product_embeddings (product_id, user_id);