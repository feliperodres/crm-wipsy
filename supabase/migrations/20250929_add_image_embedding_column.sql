-- Agregar columna para almacenar embeddings de imágenes usando CLIP
ALTER TABLE products 
ADD COLUMN image_embedding vector(512);

-- Crear índice para búsquedas rápidas de similitud
CREATE INDEX ON products USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);

-- Agregar comentario
COMMENT ON COLUMN products.image_embedding IS 'CLIP embedding vector para búsqueda por similitud de imágenes';



