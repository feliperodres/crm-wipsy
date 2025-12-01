-- Restaurar la función de limpieza para eliminar etiquetas "Pedido nuevo" después de 24 horas
CREATE OR REPLACE FUNCTION public.cleanup_expired_system_tags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Eliminar etiquetas "Pedido nuevo" que tengan más de 24 horas
  DELETE FROM customer_tags ct
  USING tags t
  WHERE ct.tag_id = t.id
    AND t.name = 'Pedido nuevo'
    AND ct.assigned_by_type = 'agent'
    AND ct.assigned_at < (now() - interval '24 hours');
    
  -- Log de limpieza
  RAISE NOTICE 'Cleaned up expired Pedido nuevo tags';
END;
$$;

-- Asegurar que el trabajo cron esté configurado para ejecutar cada hora
SELECT cron.unschedule('cleanup-expired-tags');
SELECT cron.schedule(
  'cleanup-expired-tags',
  '0 * * * *', -- Cada hora
  $$SELECT public.cleanup_expired_system_tags();$$
);