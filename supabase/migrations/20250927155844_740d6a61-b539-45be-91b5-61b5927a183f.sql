-- Corregir los stripe_price_id con los precios LIVE correctos de Stripe
UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC09LRrzAYjX2DzUa0deEtV'
WHERE plan_id = 'starter';

UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC09ZRrzAYjX2DzIkigacmO'
WHERE plan_id = 'pro';

UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC09kRrzAYjX2DzqLNJahOi'
WHERE plan_id = 'business';