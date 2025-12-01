-- Crear política para permitir acceso público a productos activos
CREATE POLICY "Public can view active products" 
ON public.products 
FOR SELECT 
USING (is_active = true);

-- Verificar que la política de store_settings ya permite acceso público
-- (la política ya existe: "Public can view active stores")