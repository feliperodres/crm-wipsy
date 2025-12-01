-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for chats table
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Enable realtime for customers table
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;