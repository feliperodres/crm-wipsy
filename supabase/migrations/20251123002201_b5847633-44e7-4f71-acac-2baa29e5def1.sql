-- Relax products SELECT policy so any role can see active public store products
ALTER POLICY "Users can view their own products"
ON products
USING (
  auth.uid() = user_id
  OR (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM store_settings
      WHERE store_settings.user_id = products.user_id
      AND store_settings.is_active = true
    )
  )
);