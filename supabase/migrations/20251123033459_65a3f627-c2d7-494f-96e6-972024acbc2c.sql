-- Ensure store_settings has show_out_of_stock flag
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS show_out_of_stock boolean NOT NULL DEFAULT true;

-- Replace existing RPC with expanded return signature including show_out_of_stock
DROP FUNCTION IF EXISTS public.get_store_public_options(text);

CREATE FUNCTION public.get_store_public_options(store_slug_param text)
RETURNS TABLE (
  address text,
  contact_email text,
  contact_phone text,
  payment_methods jsonb,
  shipping_rates jsonb,
  show_out_of_stock boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.address,
    s.contact_email,
    s.contact_phone,
    s.payment_methods,
    s.shipping_rates,
    s.show_out_of_stock
  FROM store_settings s
  JOIN public_store_cache c ON c.user_id = s.user_id
  WHERE c.store_slug = store_slug_param
    AND c.is_active = true
    AND s.is_active = true;
$$;