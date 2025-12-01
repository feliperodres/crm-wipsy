-- Update the search_products_by_similarity function to include images
CREATE OR REPLACE FUNCTION public.search_products_by_similarity(
  target_user_id UUID,
  query_embedding TEXT,
  similarity_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_description TEXT,
  category TEXT,
  price NUMERIC,
  stock INT,
  images JSONB,
  variants JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
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
    pe.images,
    pe.variants,
    (1 - (pe.embedding::vector <=> query_embedding::vector)) as similarity
  FROM product_embeddings pe
  WHERE pe.user_id = target_user_id
    AND (1 - (pe.embedding::vector <=> query_embedding::vector)) >= similarity_threshold
  ORDER BY pe.embedding::vector <=> query_embedding::vector
  LIMIT match_count;
END;
$$;