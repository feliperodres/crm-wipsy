-- Crear tabla optimizada para el agente AI con información mínima del inventario
CREATE TABLE public.agent_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.agent_inventory ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own agent inventory" 
ON public.agent_inventory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent inventory" 
ON public.agent_inventory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent inventory" 
ON public.agent_inventory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent inventory" 
ON public.agent_inventory 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_agent_inventory_updated_at
BEFORE UPDATE ON public.agent_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para mejorar performance
CREATE INDEX idx_agent_inventory_user_id ON public.agent_inventory(user_id);
CREATE INDEX idx_agent_inventory_product_id ON public.agent_inventory(product_id);

-- Función para sincronizar inventario desde productos principales
CREATE OR REPLACE FUNCTION public.sync_agent_inventory(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Eliminar inventario existente del usuario
  DELETE FROM public.agent_inventory WHERE user_id = target_user_id;
  
  -- Insertar inventario actualizado con información mínima
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
      '[{"id": null, "title": "Default", "price": ' || p.price || ', "stock": ' || p.stock || ', "available": ' || p.is_active || '}]'::jsonb
    ) as variants
  FROM public.products p
  LEFT JOIN public.product_variants pv ON p.id = pv.product_id
  WHERE p.user_id = target_user_id 
    AND p.is_active = true
  GROUP BY p.id, p.user_id, p.name, p.price, p.stock, p.is_active;
END;
$$;