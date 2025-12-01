-- First, let's check what customers exist for the current user
-- and then update shopify_orders to link them properly

-- For Shopify orders without customer_id, create or find customers based on available data
UPDATE public.shopify_orders 
SET customer_id = (
  -- Try to find existing customer by various criteria
  SELECT c.id 
  FROM public.customers c 
  WHERE c.user_id = shopify_orders.user_id 
    AND (
      -- Match by email if available
      (shopify_orders.email IS NOT NULL AND c.email = shopify_orders.email)
      OR 
      -- Match by shopify customer ID stored in phone or other fields
      (c.phone LIKE 'shopify-' || (shopify_orders.customer_data->>'id') || '%')
      OR
      -- Match by order ID pattern (fallback)
      (c.phone LIKE 'shopify-' || shopify_orders.id || '%')
    )
  LIMIT 1
)
WHERE customer_id IS NULL;

-- For remaining orders without customer_id, create default customers
INSERT INTO public.customers (user_id, name, email, phone)
SELECT DISTINCT 
  so.user_id,
  'Cliente Shopify',
  COALESCE(so.email, 'shopify-' || so.id || '@unknown.com'),
  'shopify-' || so.id || '-customer'
FROM public.shopify_orders so
WHERE so.customer_id IS NULL
ON CONFLICT (user_id, phone) DO NOTHING;

-- Now link those newly created customers
UPDATE public.shopify_orders 
SET customer_id = (
  SELECT c.id 
  FROM public.customers c 
  WHERE c.user_id = shopify_orders.user_id 
    AND c.phone = 'shopify-' || shopify_orders.id || '-customer'
  LIMIT 1
)
WHERE customer_id IS NULL;