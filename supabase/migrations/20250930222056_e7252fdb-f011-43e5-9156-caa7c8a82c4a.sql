-- Update subscription plans with LIVE Stripe price IDs
UPDATE public.subscription_plans
SET 
  stripe_price_id = 'price_1SDBuIRrzAYjX2DzpuOCBgK0',
  price_monthly = 9,
  updated_at = now()
WHERE plan_id = 'starter';

UPDATE public.subscription_plans
SET 
  stripe_price_id = 'price_1SDBuJRrzAYjX2DzqllNUCLW',
  price_monthly = 49,
  updated_at = now()
WHERE plan_id = 'pro';

UPDATE public.subscription_plans
SET 
  stripe_price_id = 'price_1SDBuLRrzAYjX2Dz9NaMNLDx',
  price_monthly = 99,
  updated_at = now()
WHERE plan_id = 'business';