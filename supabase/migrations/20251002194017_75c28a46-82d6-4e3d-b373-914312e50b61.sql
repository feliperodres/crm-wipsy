-- Primero eliminar cualquier duplicado que pueda existir
-- Mantener solo el más reciente por cada user_id
DELETE FROM public.whatsapp_evolution_credentials a
USING public.whatsapp_evolution_credentials b
WHERE a.user_id = b.user_id 
  AND a.created_at < b.created_at;

-- Ahora agregar el constraint único en user_id
-- Esto permite solo una instancia de WhatsApp por usuario en el admin
ALTER TABLE public.whatsapp_evolution_credentials
ADD CONSTRAINT whatsapp_evolution_credentials_user_id_unique UNIQUE (user_id);