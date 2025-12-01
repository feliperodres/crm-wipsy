-- Add metadata column to message_buffer to store quoted message info
ALTER TABLE message_buffer 
ADD COLUMN metadata jsonb DEFAULT NULL;