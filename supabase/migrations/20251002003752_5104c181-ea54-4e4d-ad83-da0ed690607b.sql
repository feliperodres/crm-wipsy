-- Allow admins to manage WhatsApp Evolution credentials for any user
-- Ensure idempotency
DROP POLICY IF EXISTS "Admins can view all credentials" ON public.whatsapp_evolution_credentials;
DROP POLICY IF EXISTS "Admins can insert credentials for any user" ON public.whatsapp_evolution_credentials;
DROP POLICY IF EXISTS "Admins can update credentials for any user" ON public.whatsapp_evolution_credentials;

-- View policy for admins
CREATE POLICY "Admins can view all credentials"
ON public.whatsapp_evolution_credentials
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Insert policy for admins
CREATE POLICY "Admins can insert credentials for any user"
ON public.whatsapp_evolution_credentials
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Update policy for admins
CREATE POLICY "Admins can update credentials for any user"
ON public.whatsapp_evolution_credentials
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);
