-- Eliminar todos los triggers relacionados primero
DROP TRIGGER IF EXISTS sync_product_embeddings_on_insert_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_update_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_delete_trigger ON public.products;
DROP TRIGGER IF EXISTS generate_embedding_trigger ON public.products;
DROP TRIGGER IF EXISTS generate_embedding_update_trigger ON public.products;

-- Crear el trigger corregido
CREATE TRIGGER sync_product_embeddings_on_insert_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_embeddings_on_insert();