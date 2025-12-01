-- Only drop custom triggers, not system constraint triggers
DROP TRIGGER IF EXISTS trigger_products_embedding ON public.products;
DROP TRIGGER IF EXISTS ensure_product_embedding_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_insert_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_update_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_delete_trigger ON public.products;
DROP TRIGGER IF EXISTS simple_product_insert_trigger ON public.products;
DROP TRIGGER IF EXISTS handle_product_insert_trigger ON public.products;

-- Remove all related functions
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_update() CASCADE;
DROP FUNCTION IF EXISTS public.sync_product_embeddings_on_delete() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_embedding_generation() CASCADE;
DROP FUNCTION IF EXISTS public.generate_embedding_async() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_product_embedding() CASCADE;
DROP FUNCTION IF EXISTS public.handle_product_change() CASCADE;
DROP FUNCTION IF EXISTS public.simple_product_insert() CASCADE;