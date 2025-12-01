-- Fix the sync_product_embeddings_on_insert function to handle JSON properly
CREATE OR REPLACE FUNCTION public.sync_product_embeddings_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert new product into product_embeddings
  INSERT INTO public.product_embeddings (
    user_id,
    product_id,
    product_name,
    product_description,
    category,
    price,
    stock,
    images,
    variants,
    metadata
  )
  VALUES (
    NEW.user_id,
    NEW.id,
    NEW.name,
    NEW.description,
    NEW.category,
    NEW.price,
    NEW.stock,
    NEW.images,
    jsonb_build_array(
      jsonb_build_object(
        'id', null,
        'title', 'Default',
        'price', NEW.price,
        'stock', NEW.stock,
        'available', NEW.is_active
      )
    ),
    jsonb_build_object(
      'is_active', NEW.is_active,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    )
  );
  
  RETURN NEW;
END;
$$;