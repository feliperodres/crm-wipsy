
-- Corregir el trigger track_ai_message_auto para que funcione correctamente con JSONB
-- Este bug estaba causando que los mensajes del agente no se registraran en la base de datos

-- Función corregida que se ejecuta automáticamente al insertar un mensaje
CREATE OR REPLACE FUNCTION track_ai_message_auto()
RETURNS TRIGGER AS $$
DECLARE
  chat_record RECORD;
  usage_result JSONB;  -- Cambio: ahora es JSONB en lugar de RECORD
BEGIN
  -- Solo procesar mensajes de tipo 'business' (respuestas del negocio)
  IF NEW.sender_type = 'business' THEN
    
    -- Obtener información del chat
    SELECT c.user_id, c.ai_agent_enabled
    INTO chat_record
    FROM chats c
    WHERE c.id = NEW.chat_id;
    
    -- Si el chat tiene IA habilitada, contabilizar el mensaje
    IF chat_record.ai_agent_enabled = true THEN
      
      -- Llamar a la función existente para incrementar uso
      SELECT increment_ai_message_usage(
        target_user_id := chat_record.user_id,
        tokens_used := 1,
        cost_amount := 0.001,
        chat_id_param := NEW.chat_id,
        message_content_param := SUBSTRING(NEW.content, 1, 500)
      ) INTO usage_result;
      
      -- Log para debugging (ahora usando JSONB correctamente)
      RAISE NOTICE 'AI message tracked for user %, chat %, should_charge: %', 
        chat_record.user_id, NEW.chat_id, usage_result->>'should_charge';
      
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Rehabilitar el agente para todos los chats del usuario de prueba felipe.rodriguez@gmai.com
UPDATE chats 
SET ai_agent_enabled = true 
WHERE user_id = '1979cbe7-82f6-4d16-b564-d255e5679ee8';

-- Rehabilitar el agente para todos los clientes del usuario de prueba
UPDATE customers 
SET ai_agent_enabled = true 
WHERE user_id = '1979cbe7-82f6-4d16-b564-d255e5679ee8';

-- Crear índice para whatsapp_message_id si no existe (optimización)
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id 
ON messages(whatsapp_message_id) 
WHERE whatsapp_message_id IS NOT NULL;

COMMENT ON FUNCTION track_ai_message_auto() IS 
'Trigger automático corregido que contabiliza mensajes de IA cuando sender_type=business y ai_agent_enabled=true. Ahora maneja correctamente el resultado JSONB de increment_ai_message_usage.';
