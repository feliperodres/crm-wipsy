-- Crear función para generar embeddings automáticamente
CREATE OR REPLACE FUNCTION public.auto_generate_image_embeddings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo procesar si el producto tiene imágenes y está activo
  IF NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 AND NEW.is_active = true THEN
    -- Llamar la función edge function en background para generar embeddings
    PERFORM http_post(
      'https://fczgowziugcvrpgfelks.supabase.co/functions/v1/generate-product-image-embeddings',
      json_build_object(
        'productId', NEW.id::text,
        'userId', NEW.user_id::text
      )::text,
      'application/json'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear trigger para productos nuevos
CREATE OR REPLACE TRIGGER trigger_auto_generate_image_embeddings_insert
AFTER INSERT ON public.products
FOR EACH ROW
WHEN (NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 AND NEW.is_active = true)
EXECUTE FUNCTION public.auto_generate_image_embeddings();

-- Crear trigger para productos actualizados (cuando cambien las imágenes)
CREATE OR REPLACE TRIGGER trigger_auto_generate_image_embeddings_update
AFTER UPDATE OF images ON public.products
FOR EACH ROW
WHEN (NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 AND NEW.is_active = true AND NEW.images IS DISTINCT FROM OLD.images)
EXECUTE FUNCTION public.auto_generate_image_embeddings();