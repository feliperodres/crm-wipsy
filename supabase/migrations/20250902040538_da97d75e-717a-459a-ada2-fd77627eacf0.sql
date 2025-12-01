-- Actualizar el trigger para generar embeddings automáticamente
CREATE OR REPLACE FUNCTION public.generate_embedding_async()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text := 'https://fczgowziugcvrpgfelks.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemdvd3ppdWdjdnJwZ2ZlbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzYzNTgsImV4cCI6MjA3MTg1MjM1OH0.W5Go_8HIBckTw2F0bhaw2cmtmFvTCh5qAcvDSfQ5hYs';
  request_id text;
BEGIN
  -- Solo generar embedding para productos activos
  IF NEW.is_active = true THEN
    -- Usar pg_net para hacer la llamada asíncrona
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/generate-single-product-embedding',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'productId', NEW.id,
        'userId', NEW.user_id
      )
    ) INTO request_id;
    
    -- Log para debugging
    RAISE LOG 'Triggered embedding generation for product % (request_id: %)', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS sync_product_embeddings_on_insert_trigger ON public.products;

-- Crear nuevo trigger que llama a la función asíncrona
CREATE TRIGGER generate_embedding_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_embedding_async();

-- También crear trigger para actualizaciones
DROP TRIGGER IF EXISTS generate_embedding_update_trigger ON public.products;
CREATE TRIGGER generate_embedding_update_trigger
  AFTER UPDATE OF name, description, category, price, stock, is_active, images ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_embedding_async();