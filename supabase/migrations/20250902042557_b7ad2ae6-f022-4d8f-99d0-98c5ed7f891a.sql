-- Remove ALL existing triggers on products table
DROP TRIGGER IF EXISTS trigger_products_embedding ON public.products;
DROP TRIGGER IF EXISTS ensure_product_embedding_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_insert_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_update_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_delete_trigger ON public.products;

-- Remove existing sync functions
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_insert();
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_update();
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_delete();
DROP FUNCTION IF EXISTS public.trigger_embedding_generation();
DROP FUNCTION IF EXISTS public.generate_embedding_async();

-- Clean up any orphaned product_embeddings entries
DELETE FROM public.product_embeddings 
WHERE product_id NOT IN (SELECT id FROM public.products);

-- Create a simple, clean trigger function
CREATE OR REPLACE FUNCTION public.handle_product_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Just insert the product into embeddings table, no HTTP calls
    INSERT INTO public.product_embeddings (
      user_id, product_id, product_name, product_description, 
      category, price, stock, images, variants, metadata
    )
    VALUES (
      NEW.user_id, NEW.id, NEW.name, NEW.description,
      NEW.category, NEW.price, NEW.stock, NEW.images,
      '[]'::jsonb,
      jsonb_build_object('is_active', NEW.is_active, 'needs_embedding', true)
    )
    ON CONFLICT (product_id, user_id) DO NOTHING;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create simple trigger ONLY for INSERT
CREATE TRIGGER handle_product_insert_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_change();