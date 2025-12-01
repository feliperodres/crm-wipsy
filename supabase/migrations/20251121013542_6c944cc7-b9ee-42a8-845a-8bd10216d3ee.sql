-- Add AI function support to flow_steps table
ALTER TABLE flow_steps
ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN flow_steps.ai_prompt IS 'Custom prompt for AI function steps';
COMMENT ON COLUMN flow_steps.ai_config IS 'Configuration for AI functions (temperature, model, function_type, etc.)';