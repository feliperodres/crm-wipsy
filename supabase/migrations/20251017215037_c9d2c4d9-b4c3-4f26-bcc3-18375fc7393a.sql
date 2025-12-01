-- Eliminar la restricción única en user_id que impide múltiples instancias
-- Esto permitirá que un usuario tenga múltiples instancias de WhatsApp
-- La restricción compuesta (user_id + instance_name) se mantiene para prevenir duplicados
ALTER TABLE whatsapp_evolution_credentials 
DROP CONSTRAINT IF EXISTS whatsapp_evolution_credentials_user_id_unique;

-- Comentario: Ahora los usuarios pueden tener múltiples instancias,
-- siempre y cuando cada una tenga un instance_name diferente