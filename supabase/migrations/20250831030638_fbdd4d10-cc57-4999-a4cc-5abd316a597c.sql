-- Corregir warnings de seguridad en las funciones

-- Función 1: get_user_conversations con search_path seguro
CREATE OR REPLACE FUNCTION public.get_user_conversations(target_user_id UUID)
RETURNS TABLE (
    chat_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) 
LANGUAGE SQL
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
        ) as unread_count
    FROM public.chats c
    JOIN public.customers cu ON c.customer_id = cu.id
    WHERE c.user_id = target_user_id
    ORDER BY c.last_message_at DESC;
$$;

-- Función 2: get_chat_messages con search_path seguro
CREATE OR REPLACE FUNCTION public.get_chat_messages(target_chat_id UUID, target_user_id UUID)
RETURNS TABLE (
    message_id UUID,
    content TEXT,
    sender_type TEXT,
    message_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN,
    metadata JSONB
) 
LANGUAGE SQL
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
        m.metadata
    FROM public.messages m
    JOIN public.chats c ON m.chat_id = c.id
    WHERE m.chat_id = target_chat_id 
    AND c.user_id = target_user_id
    ORDER BY m.created_at ASC;
$$;

-- Función 3: get_user_whatsapp_data con search_path seguro
CREATE OR REPLACE FUNCTION public.get_user_whatsapp_data(target_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    business_name TEXT,
    whatsapp_number TEXT,
    ai_agent_role TEXT,
    ai_agent_objective TEXT,
    total_chats BIGINT,
    total_customers BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        p.user_id,
        p.business_name,
        p.whatsapp_number,
        p.ai_agent_role,
        p.ai_agent_objective,
        (SELECT COUNT(*) FROM public.chats WHERE user_id = target_user_id) as total_chats,
        (SELECT COUNT(*) FROM public.customers WHERE user_id = target_user_id) as total_customers
    FROM public.profiles p
    WHERE p.user_id = target_user_id;
$$;