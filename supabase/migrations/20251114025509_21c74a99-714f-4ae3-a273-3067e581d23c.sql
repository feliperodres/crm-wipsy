-- Crear trigger automático para tracking de mensajes IA (reintento)

-- Función que se ejecuta automáticamente al insertar un mensaje
CREATE OR REPLACE FUNCTION track_ai_message_auto()
RETURNS TRIGGER AS $$
DECLARE
  chat_record RECORD;
  usage_result RECORD;
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
      SELECT * INTO usage_result
      FROM increment_ai_message_usage(
        target_user_id := chat_record.user_id,
        tokens_used := 1,
        cost_amount := 0.001,
        chat_id_param := NEW.chat_id,
        message_content_param := SUBSTRING(NEW.content, 1, 500)
      );
      
      -- Log para debugging
      RAISE NOTICE 'AI message tracked for user %, chat %, should_charge: %', 
        chat_record.user_id, NEW.chat_id, usage_result.should_charge;
      
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear el trigger en la tabla messages
DROP TRIGGER IF EXISTS after_message_insert_track_ai ON messages;

CREATE TRIGGER after_message_insert_track_ai
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION track_ai_message_auto();

COMMENT ON FUNCTION track_ai_message_auto() IS 'Trigger automático que contabiliza mensajes de IA cuando sender_type=business y ai_agent_enabled=true';
COMMENT ON TRIGGER after_message_insert_track_ai ON messages IS 'Contabiliza automáticamente mensajes de IA sin modificar código de la aplicación';