-- Remove the overly permissive public policy that allows viewing all active products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

-- Ensure users can only view their own products
-- This policy already exists, but we're being explicit
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
CREATE POLICY "Users can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id);