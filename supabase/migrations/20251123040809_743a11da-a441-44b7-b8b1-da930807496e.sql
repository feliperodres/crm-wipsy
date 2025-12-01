-- Drop and recreate the get_store_public_options function with new fields
DROP FUNCTION IF EXISTS public.get_store_public_options(text);

CREATE FUNCTION public.get_store_public_options(store_slug_param text)
RETURNS TABLE (
  contact_email text,
  contact_phone text,
  whatsapp_number text,
  address text,
  show_out_of_stock boolean,
  show_whatsapp_button boolean,
  shipping_rates jsonb,
  payment_methods jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.contact_email,
    s.contact_phone,
    s.whatsapp_number,
    s.address,
    s.show_out_of_stock,
    s.show_whatsapp_button,
    s.shipping_rates,
    s.payment_methods
  FROM public.store_settings s
  WHERE s.store_slug = store_slug_param 
    AND s.is_active = true
  LIMIT 1;
END;
$$;