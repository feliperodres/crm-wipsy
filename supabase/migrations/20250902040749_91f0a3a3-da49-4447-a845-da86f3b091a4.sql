-- Eliminar triggers existentes primero
DROP TRIGGER IF EXISTS generate_embedding_trigger ON public.products;
DROP TRIGGER IF EXISTS generate_embedding_update_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_insert_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_update_trigger ON public.products;
DROP TRIGGER IF EXISTS sync_product_embeddings_on_delete_trigger ON public.products;

-- Crear nuevo trigger que llama a la función asíncrona
CREATE TRIGGER generate_embedding_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_embedding_async();

-- También crear trigger para actualizaciones
CREATE TRIGGER generate_embedding_update_trigger
  AFTER UPDATE OF name, description, category, price, stock, is_active, images ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_embedding_async();