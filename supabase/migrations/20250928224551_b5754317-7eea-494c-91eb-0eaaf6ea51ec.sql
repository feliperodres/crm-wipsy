-- Primero, eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS trigger_auto_generate_image_embeddings_insert ON public.products;
DROP TRIGGER IF EXISTS trigger_auto_generate_image_embeddings_update ON public.products;
DROP FUNCTION IF EXISTS public.auto_generate_image_embeddings();

-- Crear función mejorada para generar embeddings automáticamente
CREATE OR REPLACE FUNCTION public.auto_generate_image_embeddings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    webhook_url text := 'https://fczgowziugcvrpgfelks.supabase.co/functions/v1/generate-product-image-embeddings';
    payload jsonb;
    headers jsonb;
BEGIN
  -- Solo procesar si el producto tiene imágenes y está activo
  IF NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 AND NEW.is_active = true THEN
    
    -- Preparar payload
    payload := jsonb_build_object(
      'productId', NEW.id::text,
      'userId', NEW.user_id::text
    );
    
    -- Preparar headers
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    );
    
    -- Intentar llamar la función edge usando http extension
    BEGIN
      PERFORM http_post(webhook_url, payload::text, 'application/json');
      RAISE NOTICE 'Image embeddings generation triggered for product %', NEW.id;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Failed to trigger image embeddings generation for product %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear trigger para productos nuevos
CREATE TRIGGER trigger_auto_generate_image_embeddings_insert
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_image_embeddings();

-- Crear trigger para productos actualizados (cuando cambien las imágenes)
CREATE TRIGGER trigger_auto_generate_image_embeddings_update
AFTER UPDATE OF images ON public.products
FOR EACH ROW
WHEN (NEW.images IS DISTINCT FROM OLD.images)
EXECUTE FUNCTION public.auto_generate_image_embeddings();