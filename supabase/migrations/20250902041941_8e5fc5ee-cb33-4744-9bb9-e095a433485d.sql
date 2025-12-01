-- Limpiar duplicados en product_embeddings manteniendo el más reciente
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id, user_id ORDER BY created_at DESC) as rn
  FROM public.product_embeddings
)
DELETE FROM public.product_embeddings 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Crear índice único después de limpiar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_embeddings_unique 
ON public.product_embeddings (product_id, user_id);