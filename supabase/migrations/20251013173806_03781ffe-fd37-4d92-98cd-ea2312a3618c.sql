-- Add admin RLS policies to allow admins to manage all Shopify integrations
-- This enables admin users to SELECT and UPDATE any row in public.shopify_integrations

-- Policy: Admins can view all Shopify integrations
CREATE POLICY "Admins can view all Shopify integrations"
ON public.shopify_integrations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Policy: Admins can update all Shopify integrations
CREATE POLICY "Admins can update all Shopify integrations"
ON public.shopify_integrations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
