-- Update subscription plans with new LIVE Stripe price IDs
UPDATE public.subscription_plans
SET stripe_price_id = 'price_1SDBgWRrzAYjX2DzgtcT9Xf5'
WHERE plan_id = 'starter';

UPDATE public.subscription_plans
SET stripe_price_id = 'price_1SDBgcRrzAYjX2DzA1TaDW75'
WHERE plan_id = 'pro';

UPDATE public.subscription_plans
SET stripe_price_id = 'price_1SDBgfRrzAYjX2DzinZUQFEU'
WHERE plan_id = 'business';