-- Corregir la asignación correcta de stripe_price_id según los precios reales de Stripe
-- Starter: $9.00 mensual
UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC09LRrzAYjX2DzUa0deEtV'
WHERE plan_id = 'starter';

-- Pro: $49.00 mensual  
UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC09ZRrzAYjX2DzIkigacmO'
WHERE plan_id = 'pro';

-- Business: $99.00 mensual
UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC09kRrzAYjX2DzqLNJahOi'
WHERE plan_id = 'business';