-- Create store_settings table for online store configuration
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_name TEXT NOT NULL DEFAULT 'Mi Tienda',
  store_description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  accent_color TEXT DEFAULT '#06b6d4',
  is_active BOOLEAN NOT NULL DEFAULT true,
  custom_domain TEXT,
  store_slug TEXT UNIQUE,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  social_media JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for store_settings
CREATE POLICY "Users can view their own store settings" 
ON public.store_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own store settings" 
ON public.store_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store settings" 
ON public.store_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy for public access to active stores
CREATE POLICY "Public can view active stores" 
ON public.store_settings 
FOR SELECT 
USING (is_active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint for user_id to ensure one store per user
ALTER TABLE public.store_settings 
ADD CONSTRAINT unique_user_store UNIQUE (user_id);

-- Generate store_slug function
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
$$ LANGUAGE plpgsql;

-- Create trigger for automatic slug generation
CREATE TRIGGER generate_store_slug_trigger
BEFORE INSERT OR UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.generate_store_slug();