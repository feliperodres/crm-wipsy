-- Drop existing trigger
DROP TRIGGER IF EXISTS ensure_product_embedding_trigger ON public.products;

-- Fix the trigger function to handle existing entries properly
CREATE OR REPLACE FUNCTION public.ensure_product_embedding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only for active products  
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    -- Insert without worrying about duplicates - let ON CONFLICT handle it
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
    ON CONFLICT (product_id, user_id) DO NOTHING;
    
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active = true THEN
    -- Update existing embedding entry
    UPDATE public.product_embeddings 
    SET 
      product_name = NEW.name,
      product_description = NEW.description,
      category = NEW.category,
      price = NEW.price,
      stock = NEW.stock,
      images = NEW.images,
      metadata = jsonb_build_object(
        'is_active', NEW.is_active, 'needs_embedding', true,
        'created_at', OLD.created_at, 'updated_at', NEW.updated_at
      ),
      updated_at = now()
    WHERE product_id = NEW.id AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger  
CREATE TRIGGER ensure_product_embedding_trigger
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_product_embedding();