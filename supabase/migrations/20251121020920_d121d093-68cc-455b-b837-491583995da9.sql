-- Add trigger_type column to flow_executions for tracking
ALTER TABLE flow_executions ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'first_message', 'inactivity', 'no_response'));

-- Create compound index for efficient cooldown checks
CREATE INDEX IF NOT EXISTS idx_flow_executions_cooldown 
ON flow_executions(flow_id, chat_id, started_at DESC);