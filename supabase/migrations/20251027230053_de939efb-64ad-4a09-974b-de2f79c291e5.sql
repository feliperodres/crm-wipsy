-- Add ai_agent_enabled to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS ai_agent_enabled BOOLEAN NOT NULL DEFAULT true;

-- Copy existing ai_agent_enabled values from customers to their chats
UPDATE chats
SET ai_agent_enabled = customers.ai_agent_enabled
FROM customers
WHERE chats.customer_id = customers.id;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chats_ai_agent_enabled ON chats(ai_agent_enabled);

-- Add comment explaining the column
COMMENT ON COLUMN chats.ai_agent_enabled IS 'Controls whether AI agent is enabled for this specific chat instance';