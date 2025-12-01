-- Eliminar la restricción única en user_id que impide múltiples instancias
ALTER TABLE public.whatsapp_evolution_credentials
DROP CONSTRAINT IF EXISTS whatsapp_evolution_credentials_user_id_key;

-- Crear una restricción única compuesta para user_id + instance_name
-- Esto permite múltiples instancias por usuario, pero no instancias duplicadas
ALTER TABLE public.whatsapp_evolution_credentials
ADD CONSTRAINT whatsapp_evolution_credentials_user_id_instance_name_key 
UNIQUE (user_id, instance_name);

-- Crear un índice para mejorar el rendimiento en consultas por user_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_evolution_credentials_user_id 
ON public.whatsapp_evolution_credentials(user_id);