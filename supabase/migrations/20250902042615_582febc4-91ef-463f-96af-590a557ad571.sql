-- Remove ALL triggers and functions with CASCADE
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_update() CASCADE;
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_delete() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_embedding_generation() CASCADE;
DROP FUNCTION IF EXISTS public.generate_embedding_async() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_product_embedding() CASCADE;

-- Clean up any orphaned product_embeddings entries
DELETE FROM public.product_embeddings 
WHERE product_id NOT IN (SELECT id FROM public.products);

-- Create a minimal trigger function
CREATE OR REPLACE FUNCTION public.simple_product_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Just insert basic data, no HTTP calls
  INSERT INTO public.product_embeddings (
    user_id, product_id, product_name, product_description, 
    category, price, stock, images, variants, metadata
  )
  VALUES (
    NEW.user_id, NEW.id, NEW.name, NEW.description,
    NEW.category, NEW.price, NEW.stock, NEW.images,
    '[]'::jsonb,
    jsonb_build_object('is_active', NEW.is_active)
  )
  ON CONFLICT (product_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Create minimal trigger
CREATE TRIGGER simple_product_insert_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_product_insert();