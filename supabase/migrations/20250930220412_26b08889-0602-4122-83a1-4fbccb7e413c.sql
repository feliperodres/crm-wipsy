-- Update subscription plans with correct Stripe price IDs
UPDATE public.subscription_plans
SET 
  stripe_price_id = 'price_1SDBe4RrzAYjX2DzBYPwp1vN',
  price_monthly = 9
WHERE plan_id = 'starter';

UPDATE public.subscription_plans
SET 
  stripe_price_id = 'price_1SDBeDRrzAYjX2DzybGWPtVg',
  price_monthly = 49
WHERE plan_id = 'pro';

UPDATE public.subscription_plans
SET 
  stripe_price_id = 'price_1SDBeDRrzAYjX2DzlwpkLZyb',
  price_monthly = 99
WHERE plan_id = 'business';