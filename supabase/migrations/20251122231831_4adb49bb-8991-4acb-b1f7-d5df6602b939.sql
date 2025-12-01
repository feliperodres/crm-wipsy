-- Update products SELECT policy to allow public viewing of active store products
ALTER POLICY "Users can view their own products"
ON products
USING (
  auth.uid() = user_id
  OR (
    auth.role() = 'anon'
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM store_settings
      WHERE store_settings.user_id = products.user_id
      AND store_settings.is_active = true
    )
  )
);

-- Remove now-redundant public policy to avoid restrictive conflicts
DROP POLICY IF EXISTS "Public can view products from active stores" ON products;