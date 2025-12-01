-- Función para sincronizar el estado de bloqueo de todos los usuarios
CREATE OR REPLACE FUNCTION sync_all_ai_block_status()
RETURNS void AS $$
BEGIN
  -- Actualizar profiles para usuarios que han excedido el límite
  UPDATE profiles
  SET ai_messages_blocked = true
  WHERE user_id IN (
    SELECT uc.user_id
    FROM usage_counters uc
    LEFT JOIN user_subscriptions us ON us.user_id = uc.user_id AND us.status = 'active'
    LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
    WHERE uc.year = EXTRACT(YEAR FROM NOW())
      AND uc.month = EXTRACT(MONTH FROM NOW())
      AND uc.ai_messages_used >= (COALESCE(sp.max_ai_messages, 100) + uc.extra_messages_purchased)
  )
  AND ai_messages_blocked = false;
  
  -- Desbloquear usuarios que están bajo el límite
  UPDATE profiles
  SET ai_messages_blocked = false
  WHERE user_id IN (
    SELECT uc.user_id
    FROM usage_counters uc
    LEFT JOIN user_subscriptions us ON us.user_id = uc.user_id AND us.status = 'active'
    LEFT JOIN subscription_plans sp ON sp.plan_id = us.plan_id
    WHERE uc.year = EXTRACT(YEAR FROM NOW())
      AND uc.month = EXTRACT(MONTH FROM NOW())
      AND uc.ai_messages_used < (COALESCE(sp.max_ai_messages, 100) + uc.extra_messages_purchased)
  )
  AND ai_messages_blocked = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar la sincronización inmediatamente
SELECT sync_all_ai_block_status();

COMMENT ON FUNCTION sync_all_ai_block_status() IS 
'Sincroniza el estado de bloqueo de todos los usuarios basándose en su uso actual.';