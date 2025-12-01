-- Move recent messages sent to wrong chat into the correct Meta chat
DO $$
DECLARE
  wrong_chat UUID := 'd9269c66-1444-4c4c-be45-9476c4798b37';
  correct_chat UUID := 'acc5677f-bd7b-4e50-b74a-b1556a4ee1ff';
BEGIN
  -- Reassign only recent messages from today to avoid historical side-effects
  UPDATE public.messages
  SET chat_id = correct_chat
  WHERE chat_id = wrong_chat
    AND created_at >= date_trunc('day', now());

  -- Touch correct chat's last_message_at
  UPDATE public.chats
  SET last_message_at = now()
  WHERE id = correct_chat;
END $$;