-- Create message_queue_v2 table for new buffering system
CREATE TABLE IF NOT EXISTS public.message_queue_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  chat_id UUID NOT NULL,
  
  -- Message content
  message_content TEXT,
  message_type TEXT NOT NULL, -- 'text', 'image', 'audio', 'video', 'document'
  
  -- Media processing
  media_url TEXT, -- Original media URL from Evolution API
  media_processed BOOLEAN DEFAULT false,
  media_storage_path TEXT, -- Path in Supabase Storage
  media_public_url TEXT, -- Final public URL
  media_metadata JSONB, -- { size, duration, mimeType, etc }
  
  -- Grouping with debouncing
  group_id UUID, -- Groups messages that should be sent together
  sequence_number INTEGER NOT NULL, -- Order within group
  
  -- State
  processed BOOLEAN DEFAULT false,
  sent_to_webhook BOOLEAN DEFAULT false,
  
  -- Timestamps for debouncing logic
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  group_last_message_at TIMESTAMP WITH TIME ZONE, -- Last message in this group (for debouncing)
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional metadata
  quoted_message_id TEXT,
  quoted_metadata JSONB,
  raw_webhook_data JSONB
);

-- Indexes for efficient querying
CREATE INDEX idx_message_queue_v2_processing 
  ON public.message_queue_v2(user_id, customer_id, processed, received_at);

CREATE INDEX idx_message_queue_v2_grouping 
  ON public.message_queue_v2(group_id, sent_to_webhook, group_last_message_at);

CREATE INDEX idx_message_queue_v2_media_processing 
  ON public.message_queue_v2(media_processed) 
  WHERE message_type IN ('image', 'audio', 'video', 'document');

-- RLS policies for message_queue_v2
ALTER TABLE public.message_queue_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message queue v2"
  ON public.message_queue_v2 FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own message queue v2"
  ON public.message_queue_v2 FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message queue v2"
  ON public.message_queue_v2 FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message queue v2"
  ON public.message_queue_v2 FOR DELETE
  USING (auth.uid() = user_id);

-- Add feature flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS use_webhook_v2 BOOLEAN DEFAULT false;

-- Add webhook v2 configuration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS webhook_v2_url TEXT;

-- Add buffer time configuration (in seconds)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS message_buffer_v2_seconds INTEGER DEFAULT 10;