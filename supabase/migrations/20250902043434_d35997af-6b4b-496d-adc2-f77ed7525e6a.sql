-- Update existing Shopify orders to link them with their customers
UPDATE public.shopify_orders 
SET customer_id = (
  SELECT customers.id 
  FROM public.customers 
  WHERE customers.user_id = shopify_orders.user_id 
    AND (
      customers.email = shopify_orders.email 
      OR customers.phone = (shopify_orders.customer_data->>'phone')
      OR customers.name = TRIM(CONCAT(
        COALESCE(shopify_orders.customer_data->>'first_name', ''), 
        ' ', 
        COALESCE(shopify_orders.customer_data->>'last_name', '')
      ))
    )
  LIMIT 1
)
WHERE customer_id IS NULL;