-- Function to get ready message groups (debouncing logic)
CREATE OR REPLACE FUNCTION get_ready_message_groups_v2()
RETURNS TABLE (
  group_id UUID,
  user_id UUID,
  webhook_url TEXT,
  buffer_seconds INTEGER,
  message_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    mq.group_id,
    mq.user_id,
    p.webhook_v2_url as webhook_url,
    p.message_buffer_v2_seconds as buffer_seconds,
    COUNT(*) OVER (PARTITION BY mq.group_id) as message_count
  FROM message_queue_v2 mq
  JOIN profiles p ON p.user_id = mq.user_id
  WHERE mq.sent_to_webhook = false
    AND p.use_webhook_v2 = true
    AND p.webhook_v2_url IS NOT NULL
    AND mq.group_last_message_at < (NOW() - (p.message_buffer_v2_seconds || ' seconds')::INTERVAL)
  ORDER BY mq.group_last_message_at ASC;
END;
$$;

-- Create cron job to process message queue every 2 seconds
SELECT cron.schedule(
  'process-message-queue-v2',
  '*/2 * * * * *', -- Every 2 seconds
  $$
  SELECT net.http_post(
    url := 'https://fczgowziugcvrpgfelks.supabase.co/functions/v1/process-message-queue-v2',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemdvd3ppdWdjdnJwZ2ZlbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzYzNTgsImV4cCI6MjA3MTg1MjM1OH0.W5Go_8HIBckTw2F0bhaw2cmtmFvTCh5qAcvDSfQ5hYs"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);