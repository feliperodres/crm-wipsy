-- Estructura mejorada para aplicación WhatsApp multiusuario

-- 1. Tabla de usuarios principales (tus clientes)
-- Ya existe la tabla profiles, pero vamos a asegurar que tenga los campos necesarios
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Mejorar tabla de contactos para aislar por usuario
-- La tabla customers ya existe, pero vamos a asegurar aislamiento total
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS whatsapp_id TEXT; -- ID único de WhatsApp
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_phone ON customers(user_id, phone);

-- 3. Tabla de conversaciones (chats) ya existe y está bien estructurada
-- Asegurar que tenga referencia correcta
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS whatsapp_chat_id TEXT; -- ID único del chat en WhatsApp

-- 4. Mejorar tabla de mensajes para mejor tracking
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT; -- ID único del mensaje en WhatsApp
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'; -- sent, delivered, read, failed

-- 5. Crear tabla para tracking de webhooks y eventos
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    event_type TEXT NOT NULL, -- message_received, message_sent, status_update
    webhook_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- RLS para webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhook events" 
ON public.webhook_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhook events" 
ON public.webhook_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6. Crear función para obtener conversaciones de un usuario específico
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
AS $$
    SELECT 
        c.id as chat_id,
        cu.name as customer_name,
        cu.phone as customer_phone,
        (
            SELECT content 
            FROM messages m 
            WHERE m.chat_id = c.id 
            ORDER BY m.created_at DESC 
            LIMIT 1
        ) as last_message,
        c.last_message_at,
        (
            SELECT COUNT(*) 
            FROM messages m 
            WHERE m.chat_id = c.id 
            AND m.sender_type = 'customer' 
            AND m.is_read = false
        ) as unread_count
    FROM chats c
    JOIN customers cu ON c.customer_id = cu.id
    WHERE c.user_id = target_user_id
    ORDER BY c.last_message_at DESC;
$$;

-- 7. Crear función para obtener mensajes de una conversación específica
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
AS $$
    SELECT 
        m.id as message_id,
        m.content,
        m.sender_type,
        m.message_type,
        m.created_at,
        m.is_read,
        m.metadata
    FROM messages m
    JOIN chats c ON m.chat_id = c.id
    WHERE m.chat_id = target_chat_id 
    AND c.user_id = target_user_id
    ORDER BY m.created_at ASC;
$$;

-- 8. Crear función para que el agente pueda acceder a datos de usuario
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
AS $$
    SELECT 
        p.user_id,
        p.business_name,
        p.whatsapp_number,
        p.ai_agent_role,
        p.ai_agent_objective,
        (SELECT COUNT(*) FROM chats WHERE user_id = target_user_id) as total_chats,
        (SELECT COUNT(*) FROM customers WHERE user_id = target_user_id) as total_customers
    FROM profiles p
    WHERE p.user_id = target_user_id;
$$;

-- 9. Añadir índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_chats_user_id_last_message_at ON chats(user_id, last_message_at);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id_created_at ON webhook_events(user_id, created_at);