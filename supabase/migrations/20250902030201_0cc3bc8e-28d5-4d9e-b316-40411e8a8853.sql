-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_products_insert_sync_embeddings ON public.products;
DROP TRIGGER IF EXISTS trigger_products_update_sync_embeddings ON public.products;
DROP TRIGGER IF EXISTS trigger_products_delete_sync_embeddings ON public.products;
DROP TRIGGER IF EXISTS trigger_variants_sync_embeddings ON public.product_variants;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_insert();
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_update();
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_delete();
DROP FUNCTION IF EXISTS public.sync_variants_to_embeddings();

-- Function to sync product data to product_embeddings on INSERT
CREATE OR REPLACE FUNCTION public.sync_product_embeddings_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert new product into product_embeddings
  INSERT INTO public.product_embeddings (
    user_id,
    product_id,
    product_name,
    product_description,
    category,
    price,
    stock,
    images,
    variants,
    metadata
  )
  VALUES (
    NEW.user_id,
    NEW.id,
    NEW.name,
    NEW.description,
    NEW.category,
    NEW.price,
    NEW.stock,
    NEW.images,
    '[{"id": null, "title": "Default", "price": ' || NEW.price || ', "stock": ' || NEW.stock || ', "available": ' || NEW.is_active || '}]'::jsonb,
    jsonb_build_object(
      'is_active', NEW.is_active,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    )
  );
  
  RETURN NEW;
END;
$$;

-- Function to sync product data to product_embeddings on UPDATE
CREATE OR REPLACE FUNCTION public.sync_product_embeddings_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update existing product_embeddings record
  UPDATE public.product_embeddings 
  SET 
    product_name = NEW.name,
    product_description = NEW.description,
    category = NEW.category,
    price = NEW.price,
    stock = NEW.stock,
    images = NEW.images,
    metadata = jsonb_build_object(
      'is_active', NEW.is_active,
      'created_at', OLD.created_at,
      'updated_at', NEW.updated_at
    ),
    updated_at = now()
  WHERE product_id = NEW.id AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Function to sync product data to product_embeddings on DELETE
CREATE OR REPLACE FUNCTION public.sync_product_embeddings_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete corresponding product_embeddings record
  DELETE FROM public.product_embeddings 
  WHERE product_id = OLD.id AND user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$;

-- Function to sync product variants changes to product_embeddings
CREATE OR REPLACE FUNCTION public.sync_variants_to_embeddings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_product_id uuid;
  target_user_id uuid;
BEGIN
  -- Get product_id and user_id from the variant
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
    target_user_id := OLD.user_id;
  ELSE
    target_product_id := NEW.product_id;
    target_user_id := NEW.user_id;
  END IF;
  
  -- Update the variants field in product_embeddings
  UPDATE public.product_embeddings 
  SET 
    variants = COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pv.id,
            'title', pv.title,
            'price', pv.price,
            'stock', pv.inventory_quantity,
            'available', pv.available,
            'sku', pv.sku
          ) ORDER BY pv.position
        )
        FROM public.product_variants pv 
        WHERE pv.product_id = target_product_id
      ),
      '[]'::jsonb
    ),
    updated_at = now()
  WHERE product_id = target_product_id AND user_id = target_user_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for products table
CREATE TRIGGER trigger_products_insert_sync_embeddings
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_embeddings_on_insert();

CREATE TRIGGER trigger_products_update_sync_embeddings
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_embeddings_on_update();

CREATE TRIGGER trigger_products_delete_sync_embeddings
  AFTER DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_embeddings_on_delete();

-- Create triggers for product_variants table to sync changes to embeddings
CREATE TRIGGER trigger_variants_sync_embeddings
  AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_variants_to_embeddings();