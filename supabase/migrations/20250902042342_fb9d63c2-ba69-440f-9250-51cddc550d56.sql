-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_products_embedding ON public.products;

-- Create a simpler trigger that just ensures product_embeddings sync
CREATE OR REPLACE FUNCTION public.ensure_product_embedding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only for active products
  IF NEW.is_active = true THEN
    -- Insert or update product_embeddings without calling external functions
    INSERT INTO public.product_embeddings (
      user_id, product_id, product_name, product_description, 
      category, price, stock, images, variants, metadata
    )
    VALUES (
      NEW.user_id, NEW.id, NEW.name, NEW.description,
      NEW.category, NEW.price, NEW.stock, NEW.images,
      jsonb_build_array(
        jsonb_build_object(
          'id', null, 'title', 'Default', 'price', NEW.price,
          'stock', NEW.stock, 'available', NEW.is_active
        )
      ),
      jsonb_build_object(
        'is_active', NEW.is_active, 'needs_embedding', true,
        'created_at', NEW.created_at, 'updated_at', NEW.updated_at
      )
    )
    ON CONFLICT (product_id, user_id) DO UPDATE SET
      product_name = EXCLUDED.product_name,
      product_description = EXCLUDED.product_description,
      category = EXCLUDED.category,
      price = EXCLUDED.price,
      stock = EXCLUDED.stock,
      images = EXCLUDED.images,
      metadata = EXCLUDED.metadata || jsonb_build_object('needs_embedding', true),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the new trigger
CREATE TRIGGER ensure_product_embedding_trigger
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_product_embedding();