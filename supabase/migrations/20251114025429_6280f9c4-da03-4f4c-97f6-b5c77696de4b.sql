-- Migración para contabilizar mensajes históricos de IA (simplificada)

-- Primero, actualizar los contadores directamente
INSERT INTO usage_counters (user_id, month, year, ai_messages_used)
SELECT 
  c.user_id,
  EXTRACT(MONTH FROM m.timestamp)::integer as month,
  EXTRACT(YEAR FROM m.timestamp)::integer as year,
  COUNT(*)::integer as message_count
FROM messages m
INNER JOIN chats c ON c.id = m.chat_id
WHERE m.sender_type = 'business'
  AND c.ai_agent_enabled = true
  AND m.timestamp IS NOT NULL
GROUP BY c.user_id, EXTRACT(MONTH FROM m.timestamp), EXTRACT(YEAR FROM m.timestamp)
ON CONFLICT (user_id, month, year) 
DO UPDATE SET 
  ai_messages_used = usage_counters.ai_messages_used + EXCLUDED.ai_messages_used,
  updated_at = now();

-- Crear función para logs históricos detallados (opcional)
CREATE OR REPLACE FUNCTION create_historical_ai_logs()
RETURNS bigint AS $$
DECLARE
  inserted_count bigint;
BEGIN
  -- Insertar registros históricos en ai_message_logs
  INSERT INTO ai_message_logs (user_id, chat_id, message_content, tokens_used, cost, created_at)
  SELECT 
    c.user_id,
    m.chat_id,
    SUBSTRING(m.content, 1, 500) as message_content,
    1 as tokens_used,
    0.001 as cost,
    m.timestamp as created_at
  FROM messages m
  INNER JOIN chats c ON c.id = m.chat_id
  WHERE m.sender_type = 'business'
    AND c.ai_agent_enabled = true
    AND m.timestamp IS NOT NULL
    -- Solo insertar si no existe ya
    AND NOT EXISTS (
      SELECT 1 FROM ai_message_logs al 
      WHERE al.chat_id = m.chat_id 
      AND DATE(al.created_at) = DATE(m.timestamp)
      LIMIT 1
    );
    
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_historical_ai_logs() IS 'Crea registros detallados en ai_message_logs para mensajes históricos. Ejecutar: SELECT create_historical_ai_logs();';