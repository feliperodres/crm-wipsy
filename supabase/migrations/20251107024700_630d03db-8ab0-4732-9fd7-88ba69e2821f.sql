-- Eliminar el cron job de polling ya que usaremos detección en webhook
SELECT cron.unschedule('poll-meta-messages-every-minute');