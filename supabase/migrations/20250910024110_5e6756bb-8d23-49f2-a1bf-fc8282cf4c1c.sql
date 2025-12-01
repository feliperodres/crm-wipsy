-- Actualizar la función de limpieza para trabajar con etiquetas normales del usuario
CREATE OR REPLACE FUNCTION public.cleanup_expired_system_tags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Eliminar etiquetas "Pedido nuevo" que tengan más de 24 horas y fueron asignadas por el agente
  DELETE FROM customer_tags ct
  USING tags t
  WHERE ct.tag_id = t.id
    AND t.name = 'Pedido nuevo'
    AND ct.assigned_by_type = 'agent'
    AND ct.assigned_at < (now() - interval '24 hours');
    
  -- Log de limpieza
  RAISE NOTICE 'Cleaned up expired Pedido nuevo tags assigned by agent';
END;
$$;