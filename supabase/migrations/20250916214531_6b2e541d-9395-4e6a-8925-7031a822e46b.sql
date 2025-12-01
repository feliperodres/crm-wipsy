-- Create function to expose shipping rates and payment methods publicly by slug
CREATE OR REPLACE FUNCTION public.get_store_public_options(store_slug_param text)
RETURNS TABLE(
  shipping_rates jsonb,
  payment_methods jsonb,
  contact_email text,
  contact_phone text,
  address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.shipping_rates,
    s.payment_methods,
    s.contact_email,
    s.contact_phone,
    s.address
  FROM public.store_settings s
  WHERE s.store_slug = store_slug_param 
    AND s.is_active = true;
END;
$$;