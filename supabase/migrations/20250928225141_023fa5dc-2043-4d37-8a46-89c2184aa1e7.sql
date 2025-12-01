-- Create triggers with unique names
CREATE TRIGGER trg_img_embed_insert_v2
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_image_embeddings();

CREATE TRIGGER trg_img_embed_update_v2
AFTER UPDATE OF images ON public.products
FOR EACH ROW
WHEN (NEW.images IS DISTINCT FROM OLD.images)
EXECUTE FUNCTION public.auto_generate_image_embeddings();