-- Create function for searching products by image similarity
CREATE OR REPLACE FUNCTION public.search_products_by_image_similarity(
  target_user_id uuid,
  query_embedding text,
  similarity_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10
) RETURNS TABLE(
  product_id uuid,
  product_name text,
  product_description text,
  category text,
  price numeric,
  stock integer,
  images jsonb,
  variants jsonb,
  similarity double precision,
  matched_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.category,
    p.price,
    p.stock,
    p.images,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pv.id,
            'title', pv.title,
            'price', pv.price,
            'stock', pv.inventory_quantity,
            'available', pv.available,
            'sku', pv.sku
          ) ORDER BY pv.position
        )
        FROM public.product_variants pv 
        WHERE pv.product_id = p.id
      ),
      '[]'::jsonb
    ) as variants,
    (1 - (pie.image_embedding <=> query_embedding::vector)) as similarity,
    pie.image_url as matched_image_url
  FROM public.product_image_embeddings pie
  JOIN public.products p ON pie.product_id = p.id
  WHERE pie.user_id = target_user_id
    AND p.is_active = true
    AND (1 - (pie.image_embedding <=> query_embedding::vector)) >= similarity_threshold
  ORDER BY pie.image_embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$function$;