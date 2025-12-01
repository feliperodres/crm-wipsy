-- Restaurar ai_agent_enabled en customers para Evolution API
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ai_agent_enabled boolean NOT NULL DEFAULT true;

-- Copiar valores actuales de chats a customers para chats sin whatsapp_chat_id (Evolution)
UPDATE customers c
SET ai_agent_enabled = (
  SELECT ch.ai_agent_enabled 
  FROM chats ch 
  WHERE ch.customer_id = c.id 
    AND ch.whatsapp_chat_id IS NULL
  ORDER BY ch.updated_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM chats ch 
  WHERE ch.customer_id = c.id 
    AND ch.whatsapp_chat_id IS NULL
);