-- Add metadata column to messages table for storing image URLs and additional message data
ALTER TABLE public.messages 
ADD COLUMN metadata JSONB;