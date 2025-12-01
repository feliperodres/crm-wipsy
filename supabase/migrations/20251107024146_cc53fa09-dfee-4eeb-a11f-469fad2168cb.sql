-- Habilitar extensiones si no están habilitadas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear el cron job para ejecutar cada 60 segundos
SELECT cron.schedule(
  'poll-meta-messages-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://fczgowziugcvrpgfelks.supabase.co/functions/v1/poll-meta-messages',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemdvd3ppdWdjdnJwZ2ZlbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzYzNTgsImV4cCI6MjA3MTg1MjM1OH0.W5Go_8HIBckTw2F0bhaw2cmtmFvTCh5qAcvDSfQ5hYs"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);