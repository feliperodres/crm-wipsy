-- Allow users to update messages in their chats for marking as read and adding metadata
CREATE POLICY "Users can update messages in their chats" 
ON public.messages 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM chats
  WHERE ((chats.id = messages.chat_id) AND (chats.user_id = auth.uid()))
));