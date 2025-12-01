-- Crear cron job para revisar triggers de automatización cada minuto
SELECT cron.schedule(
  'check-flow-triggers-every-minute',
  '* * * * *', -- Cada minuto
  $$
  SELECT net.http_post(
    url := 'https://fczgowziugcvrpgfelks.supabase.co/functions/v1/check-flow-triggers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemdvd3ppdWdjdnJwZ2ZlbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzYzNTgsImV4cCI6MjA3MTg1MjM1OH0.W5Go_8HIBckTw2F0bhaw2cmtmFvTCh5qAcvDSfQ5hYs"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);