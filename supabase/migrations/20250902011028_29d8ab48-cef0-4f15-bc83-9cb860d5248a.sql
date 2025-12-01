-- Insertar inventario manualmente para el usuario
INSERT INTO public.agent_inventory (user_id, product_id, product_name, variants)
SELECT 
  p.user_id,
  p.id,
  p.name,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pv.id,
        'title', pv.title,
        'price', pv.price,
        'stock', pv.inventory_quantity,
        'available', pv.available
      ) ORDER BY pv.position
    ) FILTER (WHERE pv.id IS NOT NULL),
    jsonb_build_array(
      jsonb_build_object(
        'id', null,
        'title', 'Default',
        'price', p.price,
        'stock', p.stock,
        'available', p.is_active
      )
    )
  ) as variants
FROM public.products p
LEFT JOIN public.product_variants pv ON p.id = pv.product_id
WHERE p.user_id = 'a58c6018-38ea-4aec-bf29-3ce5277cfc2d'
  AND p.is_active = true
GROUP BY p.id, p.user_id, p.name, p.price, p.stock, p.is_active;