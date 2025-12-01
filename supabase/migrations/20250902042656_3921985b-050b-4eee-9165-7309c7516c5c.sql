-- Get all trigger names on products table and drop them
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.products'::regclass
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.products', trigger_record.tgname);
    END LOOP;
END $$;

-- Remove all related functions
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_update() CASCADE;
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_delete() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_embedding_generation() CASCADE;
DROP FUNCTION IF EXISTS public.generate_embedding_async() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_product_embedding() CASCADE;
DROP FUNCTION IF EXISTS public.handle_product_change() CASCADE;
DROP FUNCTION IF EXISTS public.simple_product_insert() CASCADE;

-- Clean orphaned entries
DELETE FROM public.product_embeddings 
WHERE product_id NOT IN (SELECT id FROM public.products);