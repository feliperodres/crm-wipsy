-- Fix the get_ready_message_groups_v2 function
DROP FUNCTION IF EXISTS get_ready_message_groups_v2();

CREATE OR REPLACE FUNCTION get_ready_message_groups_v2()
RETURNS TABLE (
  group_id UUID,
  user_id UUID,
  webhook_url TEXT,
  buffer_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (mq.group_id)
    mq.group_id,
    mq.user_id,
    p.webhook_v2_url as webhook_url,
    COALESCE(p.message_buffer_v2_seconds, 10) as buffer_seconds
  FROM message_queue_v2 mq
  INNER JOIN profiles p ON p.user_id = mq.user_id
  WHERE mq.sent_to_webhook = false
    AND p.use_webhook_v2 = true
    AND p.webhook_v2_url IS NOT NULL
    AND NOW() - mq.group_last_message_at > INTERVAL '1 second' * COALESCE(p.message_buffer_v2_seconds, 10)
  ORDER BY mq.group_id, mq.group_last_message_at DESC;
END;
$$;