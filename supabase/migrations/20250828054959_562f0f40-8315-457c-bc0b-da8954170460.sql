-- Add message_type and metadata columns to messages table
ALTER TABLE public.messages 
ADD COLUMN message_type TEXT DEFAULT 'text',
ADD COLUMN metadata JSONB;