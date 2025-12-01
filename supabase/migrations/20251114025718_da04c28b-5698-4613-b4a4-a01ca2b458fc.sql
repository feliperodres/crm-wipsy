-- Actualizar get_admin_user_details para leer desde usage_counters

CREATE OR REPLACE FUNCTION public.get_admin_user_details()
RETURNS TABLE(
  user_id uuid,
  email text,
  business_name text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  total_chats bigint,
  total_ai_messages bigint,
  total_orders bigint,
  subscription_status text,
  subscription_plan text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id as user_id,
    au.email,
    p.business_name,
    au.created_at,
    au.last_sign_in_at,
    (SELECT COUNT(*) FROM chats WHERE user_id = au.id) as total_chats,
    -- Leer desde usage_counters en lugar de ai_message_logs
    (SELECT COALESCE(SUM(ai_messages_used), 0) 
     FROM usage_counters 
     WHERE user_id = au.id) as total_ai_messages,
    (SELECT COUNT(*) FROM orders WHERE user_id = au.id) as total_orders,
    COALESCE(us.status, 'free') as subscription_status,
    COALESCE(us.plan_id, 'free') as subscription_plan
  FROM auth.users au
  LEFT JOIN profiles p ON p.user_id = au.id
  LEFT JOIN user_subscriptions us ON us.user_id = au.id
  ORDER BY au.created_at DESC;
$$;