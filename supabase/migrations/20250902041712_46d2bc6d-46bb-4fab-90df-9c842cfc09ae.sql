-- Eliminar todos los triggers existentes
DROP TRIGGER IF EXISTS trigger_embedding_on_insert ON public.products;
DROP TRIGGER IF EXISTS trigger_embedding_on_update ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_insert_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_update_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_delete_trigger ON public.products;

-- Crear los nuevos triggers
CREATE TRIGGER trigger_embedding_on_insert
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embedding_generation();

CREATE TRIGGER trigger_embedding_on_update
  AFTER UPDATE OF name, description, category, price, stock, is_active, images ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_embedding_generation();