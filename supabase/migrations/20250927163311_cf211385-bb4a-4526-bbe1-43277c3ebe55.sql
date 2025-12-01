-- Actualizar subscription_plans con los nuevos stripe_price_id

UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC131RrzAYjX2DzBJbAITFk'
WHERE plan_id = 'starter';

UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC13BRrzAYjX2DzmqVvByVF'
WHERE plan_id = 'pro';

UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC13ORrzAYjX2DzwCBVZ8iA'
WHERE plan_id = 'business';