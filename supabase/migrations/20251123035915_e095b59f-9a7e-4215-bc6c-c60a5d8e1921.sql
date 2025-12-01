-- Allow public (unauthenticated) users to view variants for publicly visible products
CREATE POLICY "Public can view variants of active store products"
ON public.product_variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.public_store_cache c
      ON c.user_id = p.user_id
    WHERE p.id = product_variants.product_id
      AND p.is_active = true
      AND c.is_active = true
  )
);