-- Agregar campo para indicar quién asignó la etiqueta
ALTER TABLE customer_tags ADD COLUMN assigned_by_type text DEFAULT 'user';
ALTER TABLE customer_tags ADD COLUMN assigned_at timestamp with time zone DEFAULT now();

-- Agregar comentario para explicar los tipos
COMMENT ON COLUMN customer_tags.assigned_by_type IS 'Valores posibles: user, agent, system';

-- Crear función para asignar etiquetas automáticas del sistema
CREATE OR REPLACE FUNCTION public.assign_system_tag(
  target_customer_id uuid,
  tag_name_param text,
  tag_color_param text DEFAULT '#f59e0b',
  target_user_id uuid DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  tag_id_var uuid;
  customer_tag_id uuid;
  user_id_var uuid;
BEGIN
  -- Obtener user_id si no se proporciona
  IF target_user_id IS NULL THEN
    SELECT user_id INTO user_id_var 
    FROM customers 
    WHERE id = target_customer_id;
  ELSE
    user_id_var := target_user_id;
  END IF;

  -- Crear o buscar la etiqueta
  INSERT INTO tags (name, color, user_id)
  VALUES (tag_name_param, tag_color_param, user_id_var)
  ON CONFLICT (name, user_id) 
  DO UPDATE SET color = EXCLUDED.color
  RETURNING id INTO tag_id_var;

  -- Si no se pudo crear/encontrar, buscar existente
  IF tag_id_var IS NULL THEN
    SELECT id INTO tag_id_var 
    FROM tags 
    WHERE name = tag_name_param AND user_id = user_id_var;
  END IF;

  -- Asignar etiqueta al cliente si no existe ya
  INSERT INTO customer_tags (customer_id, tag_id, user_id, assigned_by_type, assigned_at)
  VALUES (target_customer_id, tag_id_var, user_id_var, 'agent', now())
  ON CONFLICT (customer_id, tag_id) 
  DO UPDATE SET 
    assigned_by_type = 'agent',
    assigned_at = now()
  RETURNING id INTO customer_tag_id;

  RETURN customer_tag_id;
END;
$$;

-- Crear función para limpiar etiquetas expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_system_tags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Eliminar etiquetas "Pedido Nuevo" que tengan más de 24 horas
  DELETE FROM customer_tags ct
  USING tags t
  WHERE ct.tag_id = t.id
    AND t.name = 'Pedido Nuevo'
    AND ct.assigned_by_type = 'agent'
    AND ct.assigned_at < (now() - interval '24 hours');
    
  -- Log de limpieza
  RAISE NOTICE 'Cleaned up expired system tags';
END;
$$;

-- Crear extensión pg_cron si no existe (para tareas programadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar limpieza cada hora
SELECT cron.schedule(
  'cleanup-expired-tags',
  '0 * * * *', -- Cada hora
  $$SELECT public.cleanup_expired_system_tags();$$
);