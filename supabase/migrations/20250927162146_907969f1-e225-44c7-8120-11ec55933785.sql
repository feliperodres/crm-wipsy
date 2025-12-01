-- Actualizar con los nuevos stripe_price_id del modo LIVE
UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC0s0RrzAYjX2DzRs36aOKd'
WHERE plan_id = 'starter';

UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC0sBRrzAYjX2DzzAWO8zY0'
WHERE plan_id = 'pro';

UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SC0sLRrzAYjX2DzE0J18UGT'
WHERE plan_id = 'business';