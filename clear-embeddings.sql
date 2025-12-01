-- Limpiar todos los embeddings para regenerarlos
UPDATE products 
SET image_embedding = NULL 
WHERE image_embedding IS NOT NULL;

-- Verificar que se limpiaron
SELECT 
  id, 
  name, 
  CASE 
    WHEN image_embedding IS NULL THEN 'SIN EMBEDDING'
    WHEN jsonb_array_length(image_embedding::jsonb) != 512 THEN 'DIMENSIONES INCORRECTAS: ' || jsonb_array_length(image_embedding::jsonb)
    ELSE 'OK: ' || jsonb_array_length(image_embedding::jsonb) || ' dimensiones'
  END as estado_embedding
FROM products 
WHERE is_active = true
ORDER BY name;