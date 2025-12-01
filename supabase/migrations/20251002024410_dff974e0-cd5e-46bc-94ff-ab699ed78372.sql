-- Agregar columna instance_name a la tabla chats para identificar de qué instancia proviene cada conversación
ALTER TABLE public.chats
ADD COLUMN instance_name text;

-- Crear un índice para mejorar el rendimiento en consultas por instance_name
CREATE INDEX IF NOT EXISTS idx_chats_instance_name 
ON public.chats(instance_name);

-- Comentario sobre la columna
COMMENT ON COLUMN public.chats.instance_name IS 'Nombre de la instancia de WhatsApp de la que proviene esta conversación';