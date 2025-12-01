-- Fix security issues: Set search path for security definer function
CREATE OR REPLACE FUNCTION public.generate_store_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.store_slug IS NULL OR NEW.store_slug = '' THEN
    NEW.store_slug := lower(regexp_replace(NEW.store_name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.store_slug := trim(both '-' from NEW.store_slug);
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.store_settings WHERE store_slug = NEW.store_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      NEW.store_slug := NEW.store_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;