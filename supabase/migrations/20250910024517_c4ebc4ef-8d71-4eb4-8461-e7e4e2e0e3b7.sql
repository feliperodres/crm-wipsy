-- Actualizar la función de limpieza para trabajar con etiquetas "Pedido Nuevo" (con mayúscula)
CREATE OR REPLACE FUNCTION public.cleanup_expired_system_tags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Eliminar etiquetas "Pedido Nuevo" que tengan más de 24 horas y fueron asignadas por el agente
  DELETE FROM customer_tags ct
  USING tags t
  WHERE ct.tag_id = t.id
    AND t.name = 'Pedido Nuevo'
    AND ct.assigned_by_type = 'agent'
    AND ct.assigned_at < (now() - interval '24 hours');
    
  -- Log de limpieza
  RAISE NOTICE 'Cleaned up expired Pedido Nuevo tags assigned by agent';
END;
$$;

-- Limpiar etiquetas existentes mal formateadas
DELETE FROM customer_tags 
WHERE tag_id IN (
  SELECT id FROM tags 
  WHERE name IN ('Pedidos', 'pedidos', 'Pedido nuevo', 'pedido nuevo')
);

DELETE FROM tags 
WHERE name IN ('Pedidos', 'pedidos', 'Pedido nuevo', 'pedido nuevo');