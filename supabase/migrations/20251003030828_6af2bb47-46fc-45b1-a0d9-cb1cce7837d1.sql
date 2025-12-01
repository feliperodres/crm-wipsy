-- Crear función mejorada para obtener conversaciones con información de pedidos
CREATE OR REPLACE FUNCTION public.get_admin_all_conversations_with_orders()
RETURNS TABLE(
  chat_id uuid,
  user_id uuid,
  user_email text,
  business_name text,
  customer_name text,
  customer_phone text,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count bigint,
  status text,
  has_images boolean,
  has_order boolean,
  order_count bigint,
  total_order_value numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    c.id as chat_id,
    c.user_id,
    au.email as user_email,
    p.business_name,
    cu.name as customer_name,
    cu.phone as customer_phone,
    (
      SELECT content 
      FROM public.messages m 
      WHERE m.chat_id = c.id 
      ORDER BY m.created_at DESC 
      LIMIT 1
    ) as last_message,
    c.last_message_at,
    (
      SELECT COUNT(*) 
      FROM public.messages m 
      WHERE m.chat_id = c.id 
        AND m.sender_type = 'customer' 
        AND m.is_read = false
    ) as unread_count,
    c.status,
    (
      SELECT COUNT(*) > 0
      FROM public.messages m 
      WHERE m.chat_id = c.id 
        AND (m.message_type = 'image' OR m.metadata ? 'media_url')
    ) as has_images,
    (
      SELECT COUNT(*) > 0
      FROM public.orders o
      WHERE o.customer_id = cu.id
    ) as has_order,
    (
      SELECT COUNT(*)
      FROM public.orders o
      WHERE o.customer_id = cu.id
    ) as order_count,
    (
      SELECT COALESCE(SUM(o.total), 0)
      FROM public.orders o
      WHERE o.customer_id = cu.id
    ) as total_order_value
  FROM public.chats c
  JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  LEFT JOIN auth.users au ON au.id = c.user_id
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;