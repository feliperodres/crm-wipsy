-- Fix public access to products from active stores
-- The current policy uses auth.role() which may not work correctly for anonymous users
-- We'll drop and recreate the policy to ensure it works properly

-- Drop the existing policy that has the problematic auth.role() check
DROP POLICY IF EXISTS "Users can view their own products" ON products;

-- Also drop any existing public policies that might conflict
DROP POLICY IF EXISTS "Public can view active store products" ON products;
DROP POLICY IF EXISTS "Public can view products from active stores" ON products;

-- Recreate the policy for authenticated users only
CREATE POLICY "Users can view their own products"
ON products
FOR SELECT
USING (auth.uid() = user_id);

-- Create a separate policy for public/anonymous access
-- This allows anyone (including unauthenticated users) to view active products
-- from stores that have active entries in public_store_cache
-- We use public_store_cache instead of store_settings because it has proper public access
CREATE POLICY "Public can view active store products"
ON products
FOR SELECT
TO public
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public_store_cache 
    WHERE public_store_cache.user_id = products.user_id 
    AND public_store_cache.is_active = true
  )
);

