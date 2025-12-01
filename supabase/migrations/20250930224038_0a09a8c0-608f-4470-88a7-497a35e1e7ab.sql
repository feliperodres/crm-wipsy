
-- Agregar columna para trackear el saldo pendiente de cobro por mensajes adicionales
ALTER TABLE public.usage_counters 
ADD COLUMN IF NOT EXISTS pending_charge_amount NUMERIC DEFAULT 0 NOT NULL;

-- Drop la función antigua para poder cambiar el tipo de retorno
DROP FUNCTION IF EXISTS public.increment_ai_message_usage(uuid, integer, numeric, uuid, text);

-- Crear la nueva función que retorna información sobre cobros
CREATE OR REPLACE FUNCTION public.increment_ai_message_usage(
  target_user_id uuid,
  tokens_used integer DEFAULT 1,
  cost_amount numeric DEFAULT 0,
  chat_id_param uuid DEFAULT NULL,
  message_content_param text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM now());
  current_month INTEGER := EXTRACT(MONTH FROM now());
  user_plan RECORD;
  user_usage RECORD;
  additional_message_cost NUMERIC := 0;
  new_pending_amount NUMERIC := 0;
  should_charge BOOLEAN := false;
  total_limit INTEGER;
BEGIN
  -- Obtener plan del usuario
  SELECT * INTO user_plan
  FROM get_user_current_plan(target_user_id)
  LIMIT 1;

  -- Obtener uso actual
  SELECT * INTO user_usage
  FROM get_user_current_usage(target_user_id)
  LIMIT 1;

  -- Calcular límite total (plan + mensajes adicionales comprados)
  total_limit := COALESCE(user_plan.max_ai_messages, 100) + COALESCE(user_usage.extra_messages_purchased, 0);

  -- Si el usuario ya superó su límite y hay costo por mensaje adicional
  IF user_usage.ai_messages_used >= total_limit AND user_plan.extra_message_cost IS NOT NULL AND user_plan.extra_message_cost > 0 THEN
    additional_message_cost := user_plan.extra_message_cost;
  END IF;

  -- Insertar log del mensaje
  INSERT INTO public.ai_message_logs (user_id, chat_id, message_content, tokens_used, cost, created_at)
  VALUES (target_user_id, chat_id_param, message_content_param, tokens_used, additional_message_cost, now());
  
  -- Actualizar contador de uso y acumular costo
  INSERT INTO public.usage_counters (user_id, year, month, ai_messages_used, pending_charge_amount)
  VALUES (target_user_id, current_year, current_month, 1, additional_message_cost)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET 
    ai_messages_used = usage_counters.ai_messages_used + 1,
    pending_charge_amount = usage_counters.pending_charge_amount + additional_message_cost,
    updated_at = now()
  RETURNING pending_charge_amount INTO new_pending_amount;

  -- Verificar si se debe cobrar
  IF new_pending_amount >= 5.00 THEN
    should_charge := true;
  END IF;

  -- Retornar información sobre el cobro
  RETURN jsonb_build_object(
    'success', true,
    'should_charge', should_charge,
    'pending_amount', new_pending_amount,
    'charge_amount', 5.00,
    'additional_message_cost', additional_message_cost,
    'messages_over_limit', GREATEST(0, user_usage.ai_messages_used + 1 - total_limit)
  );
END;
$$;

-- Función para resetear el saldo pendiente después de un cobro exitoso
CREATE OR REPLACE FUNCTION public.process_extra_messages_charge(
  target_user_id uuid,
  charge_amount numeric DEFAULT 5.00
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM now());
  current_month INTEGER := EXTRACT(MONTH FROM now());
  user_plan RECORD;
  messages_to_add INTEGER;
BEGIN
  -- Obtener plan del usuario para saber el costo por mensaje
  SELECT * INTO user_plan
  FROM get_user_current_plan(target_user_id)
  LIMIT 1;

  -- Calcular cuántos mensajes se compran con el monto cargado
  IF user_plan.extra_message_cost IS NOT NULL AND user_plan.extra_message_cost > 0 THEN
    messages_to_add := FLOOR(charge_amount / user_plan.extra_message_cost)::INTEGER;
  ELSE
    messages_to_add := 0;
  END IF;

  -- Actualizar contador: agregar mensajes comprados y resetear saldo pendiente
  UPDATE public.usage_counters
  SET 
    extra_messages_purchased = extra_messages_purchased + messages_to_add,
    pending_charge_amount = GREATEST(0, pending_charge_amount - charge_amount),
    updated_at = now()
  WHERE user_id = target_user_id 
    AND year = current_year 
    AND month = current_month;

  RETURN true;
END;
$$;
