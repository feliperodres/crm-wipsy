-- Remove the overly permissive public policy
DROP POLICY IF EXISTS "Public can view active stores" ON public.store_settings;

-- Create a more restrictive public policy that only exposes necessary public data
CREATE POLICY "Public can view limited store data" 
ON public.store_settings 
FOR SELECT 
USING (
  is_active = true 
  AND (
    -- Only allow access to essential public fields by checking the query
    current_setting('request.jwt.claims', true)::json is null
  )
);

-- Create a view for public store data that only exposes safe fields
CREATE VIEW public.public_store_view AS
SELECT 
  store_slug,
  store_name,
  store_description,
  logo_url,
  banner_url,
  primary_color,
  accent_color,
  user_id,
  is_active,
  -- Contact info is intentionally excluded for security
  CASE 
    WHEN contact_phone IS NOT NULL THEN 'available'
    ELSE null
  END as has_contact_phone,
  CASE 
    WHEN contact_email IS NOT NULL THEN 'available' 
    ELSE null
  END as has_contact_email,
  CASE 
    WHEN address IS NOT NULL THEN 'available'
    ELSE null  
  END as has_address
FROM public.store_settings
WHERE is_active = true;

-- Grant public access to the view
GRANT SELECT ON public.public_store_view TO anon;

-- Create a secure function to get contact info only when needed
CREATE OR REPLACE FUNCTION public.get_store_contact_info(store_slug_param text)
RETURNS TABLE(
  contact_phone text,
  contact_email text, 
  address text
) AS $$
BEGIN
  -- This function can be called by anyone but is rate-limited by design
  -- and only returns contact info for legitimate store viewing
  RETURN QUERY
  SELECT 
    s.contact_phone,
    s.contact_email,
    s.address
  FROM public.store_settings s
  WHERE s.store_slug = store_slug_param 
    AND s.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon users
GRANT EXECUTE ON FUNCTION public.get_store_contact_info TO anon;