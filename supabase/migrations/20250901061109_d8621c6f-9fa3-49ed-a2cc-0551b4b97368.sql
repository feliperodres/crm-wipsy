-- Fix the security issues from the previous migration

-- 1. Drop the insecure view and recreate it properly
DROP VIEW IF EXISTS public.public_store_view;

-- 2. Update the function to use proper search_path
DROP FUNCTION IF EXISTS public.get_store_contact_info;

CREATE OR REPLACE FUNCTION public.get_store_contact_info(store_slug_param text)
RETURNS TABLE(
  contact_phone text,
  contact_email text, 
  address text
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function provides controlled access to contact info for legitimate store viewing
  RETURN QUERY
  SELECT 
    s.contact_phone,
    s.contact_email,
    s.address
  FROM public.store_settings s
  WHERE s.store_slug = store_slug_param 
    AND s.is_active = true;
END;
$$;

-- 3. Create a secure table instead of a view for public store data
-- This avoids the SECURITY DEFINER view issue
CREATE TABLE IF NOT EXISTS public.public_store_cache (
  store_slug text PRIMARY KEY,
  store_name text NOT NULL,
  store_description text,
  logo_url text,
  banner_url text,
  primary_color text,
  accent_color text,
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  has_contact_phone boolean DEFAULT false,
  has_contact_email boolean DEFAULT false,
  has_address boolean DEFAULT false,
  last_updated timestamp with time zone DEFAULT now()
);

-- Enable RLS on the cache table
ALTER TABLE public.public_store_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to the cache
CREATE POLICY "Public can view active store cache" 
ON public.public_store_cache 
FOR SELECT 
USING (is_active = true);

-- Grant public access to the cache table
GRANT SELECT ON public.public_store_cache TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_contact_info TO anon;

-- Create function to update the cache when store_settings changes
CREATE OR REPLACE FUNCTION public.refresh_public_store_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.public_store_cache (
      store_slug,
      store_name,
      store_description,
      logo_url,
      banner_url,
      primary_color,
      accent_color,
      user_id,
      is_active,
      has_contact_phone,
      has_contact_email,
      has_address,
      last_updated
    )
    VALUES (
      NEW.store_slug,
      NEW.store_name,
      NEW.store_description,
      NEW.logo_url,
      NEW.banner_url,
      NEW.primary_color,
      NEW.accent_color,
      NEW.user_id,
      NEW.is_active,
      (NEW.contact_phone IS NOT NULL),
      (NEW.contact_email IS NOT NULL),
      (NEW.address IS NOT NULL),
      now()
    )
    ON CONFLICT (store_slug) 
    DO UPDATE SET
      store_name = EXCLUDED.store_name,
      store_description = EXCLUDED.store_description,
      logo_url = EXCLUDED.logo_url,
      banner_url = EXCLUDED.banner_url,
      primary_color = EXCLUDED.primary_color,
      accent_color = EXCLUDED.accent_color,
      user_id = EXCLUDED.user_id,
      is_active = EXCLUDED.is_active,
      has_contact_phone = EXCLUDED.has_contact_phone,
      has_contact_email = EXCLUDED.has_contact_email,
      has_address = EXCLUDED.has_address,
      last_updated = now();
      
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_store_cache WHERE store_slug = OLD.store_slug;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger to keep cache updated
DROP TRIGGER IF EXISTS sync_public_store_cache ON public.store_settings;
CREATE TRIGGER sync_public_store_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_public_store_cache();

-- Populate the cache with existing data
INSERT INTO public.public_store_cache (
  store_slug,
  store_name,
  store_description,
  logo_url,
  banner_url,
  primary_color,
  accent_color,
  user_id,
  is_active,
  has_contact_phone,
  has_contact_email,
  has_address,
  last_updated
)
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
  (contact_phone IS NOT NULL),
  (contact_email IS NOT NULL),
  (address IS NOT NULL),
  now()
FROM public.store_settings
WHERE is_active = true
ON CONFLICT (store_slug) DO NOTHING;