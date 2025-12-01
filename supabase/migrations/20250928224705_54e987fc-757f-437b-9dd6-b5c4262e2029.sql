-- Replace function to call Edge Function with Authorization header using http()
CREATE OR REPLACE FUNCTION public.auto_generate_image_embeddings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    webhook_url text := 'https://fczgowziugcvrpgfelks.supabase.co/functions/v1/generate-product-image-embeddings';
    payload text;
    anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemdvd3ppdWdjdnJwZ2ZlbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzYzNTgsImV4cCI6MjA3MTg1MjM1OH0.W5Go_8HIBckTw2F0bhaw2cmtmFvTCh5qAcvDSfQ5hYs';
BEGIN
  IF NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0 AND NEW.is_active = true THEN
    payload := jsonb_build_object(
      'productId', NEW.id::text,
      'userId', NEW.user_id::text
    )::text;

    BEGIN
      PERFORM public.http((
        'POST',
        webhook_url,
        ARRAY[
          public.http_header('Authorization', 'Bearer ' || anon_key),
          public.http_header('Content-Type', 'application/json')
        ],
        'application/json',
        payload
      )::public.http_request);
      RAISE NOTICE 'Triggered image embeddings generation for product %', NEW.id;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'Failed to trigger image embeddings for product %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;