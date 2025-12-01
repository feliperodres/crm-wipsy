-- Create RLS policy to allow public access to active products from active stores
CREATE POLICY "Public can view products from active stores"
ON products
FOR SELECT
TO public
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM store_settings 
    WHERE store_settings.user_id = products.user_id 
    AND store_settings.is_active = true
  )
);