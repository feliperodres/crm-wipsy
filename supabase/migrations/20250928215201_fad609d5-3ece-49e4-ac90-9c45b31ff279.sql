-- Create admin functions to view any user's conversations and messages
CREATE OR REPLACE FUNCTION public.get_admin_user_conversations(target_user_id uuid)
RETURNS TABLE(
  chat_id uuid,
  customer_name text,
  customer_phone text,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count bigint,
  status text
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
    c.status
  FROM public.chats c
  JOIN public.customers cu ON c.customer_id = cu.id
  WHERE c.user_id = target_user_id
  ORDER BY c.last_message_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_chat_messages(target_chat_id uuid)
RETURNS TABLE(
  message_id uuid,
  content text,
  sender_type text,
  message_type text,
  created_at timestamp with time zone,
  is_read boolean,
  metadata jsonb,
  chat_user_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id as message_id,
    m.content,
    m.sender_type,
    m.message_type,
    m.created_at,
    m.is_read,
    m.metadata,
    c.user_id as chat_user_id
  FROM public.messages m
  JOIN public.chats c ON m.chat_id = c.id
  WHERE m.chat_id = target_chat_id
  ORDER BY m.created_at ASC;
$$;