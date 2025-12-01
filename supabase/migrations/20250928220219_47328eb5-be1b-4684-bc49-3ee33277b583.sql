-- Eliminar la función existente y recrearla con el nuevo campo
DROP FUNCTION public.get_admin_user_conversations(uuid);

CREATE OR REPLACE FUNCTION public.get_admin_user_conversations(target_user_id uuid)
RETURNS TABLE(
  chat_id uuid,
  customer_name text,
  customer_phone text,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count bigint,
  status text,
  has_images boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id as chat_id,
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
    ) as has_images
  FROM public.chats c
  JOIN public.customers cu ON c.customer_id = cu.id
  WHERE c.user_id = target_user_id
  ORDER BY c.last_message_at DESC;
$$;