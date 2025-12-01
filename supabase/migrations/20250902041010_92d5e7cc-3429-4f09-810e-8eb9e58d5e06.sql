-- Arreglar el trigger para no depender de pg_net
CREATE OR REPLACE FUNCTION public.sync_product_embeddings_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert new product into product_embeddings without embedding initially
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
    jsonb_build_array(
      jsonb_build_object(
        'id', null,
        'title', 'Default',
        'price', NEW.price,
        'stock', NEW.stock,
        'available', NEW.is_active
      )
    ),
    jsonb_build_object(
      'is_active', NEW.is_active,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Eliminar trigger anterior que usaba pg_net
DROP TRIGGER IF EXISTS generate_embedding_trigger ON public.products;
DROP TRIGGER IF EXISTS generate_embedding_update_trigger ON public.products;

-- Crear nuevo trigger simple
CREATE TRIGGER sync_product_embeddings_on_insert_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_embeddings_on_insert();