-- Enable realtime for queued incoming messages so they appear instantly in the UI
ALTER TABLE public.message_queue_v2 REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_queue_v2;