-- Actualizar el plan Starter con los nuevos valores
UPDATE subscription_plans 
SET 
  price_monthly = 29,
  max_products = 100,
  max_ai_messages = 1500,
  extra_message_cost = 0.004,
  updated_at = now()
WHERE plan_id = 'starter';