-- Crear índice único para product_embeddings
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_embeddings_unique 
ON public.product_embeddings (product_id, user_id);

-- Actualizar la función del trigger para manejar conflictos correctamente
CREATE OR REPLACE FUNCTION public.trigger_embedding_generation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_result record;
BEGIN
  -- Solo procesar productos activos
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR 
     (TG_OP = 'UPDATE' AND NEW.is_active = true) THEN
    
    BEGIN
      -- Intentar usar la extensión http si está disponible
      SELECT * INTO request_result FROM http_post(
        'https://fczgowziugcvrpgfelks.supabase.co/functions/v1/generate-single-product-embedding',
        jsonb_build_object(
          'productId', NEW.id,
          'userId', NEW.user_id
        )::text,
        'application/json',
        ARRAY[
          http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemdvd3ppdWdjdnJwZ2ZlbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzYzNTgsImV4cCI6MjA3MVg1MjM1OH0.W5Go_8HIBckTw2F0bhaw2cmtmFvTCh5qAcvDSfQ5hYs')
        ]
      );
      
      RAISE LOG 'Triggered embedding generation for product % (status: %)', NEW.id, request_result.status;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Si falla la llamada HTTP, verificar si ya existe el embedding
        IF NOT EXISTS (SELECT 1 FROM product_embeddings WHERE product_id = NEW.id AND user_id = NEW.user_id) THEN
          -- Insertar nuevo embedding sin vector
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
          );
        ELSE
          -- Actualizar embedding existente
          UPDATE public.product_embeddings SET
            product_name = NEW.name,
            product_description = NEW.description,
            category = NEW.category,
            price = NEW.price,
            stock = NEW.stock,
            images = NEW.images,
            metadata = metadata || jsonb_build_object('needs_embedding', true),
            updated_at = now()
          WHERE product_id = NEW.id AND user_id = NEW.user_id;
        END IF;
          
        RAISE LOG 'HTTP call failed, marked product % for embedding generation', NEW.id;
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;