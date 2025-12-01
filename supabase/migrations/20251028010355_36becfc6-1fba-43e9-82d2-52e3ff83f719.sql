-- Add processing lock field for optimistic locking
ALTER TABLE message_queue_v2 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Create index for efficient lock checks
CREATE INDEX IF NOT EXISTS idx_message_queue_v2_processing 
ON message_queue_v2(group_id, processing_started_at) 
WHERE sent_to_webhook = false;