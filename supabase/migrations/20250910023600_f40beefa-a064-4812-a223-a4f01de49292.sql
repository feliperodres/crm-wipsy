-- Eliminar etiquetas "Pedidos" y "Pedido Nuevo" existentes para limpiar
DELETE FROM customer_tags 
WHERE tag_id IN (
  SELECT id FROM tags 
  WHERE name IN ('Pedidos', 'Pedido Nuevo')
);

-- Eliminar las etiquetas "Pedidos" y "Pedido Nuevo" de la tabla tags
DELETE FROM tags 
WHERE name IN ('Pedidos', 'Pedido Nuevo');

-- Actualizar la función de limpieza para que no haga nada con estas etiquetas
CREATE OR REPLACE FUNCTION public.cleanup_expired_system_tags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Esta función ahora solo limpia etiquetas de supervisión si es necesario
  -- No elimina etiquetas de pedidos
  RAISE NOTICE 'Cleanup function updated - no longer removes order tags';
END;
$$;