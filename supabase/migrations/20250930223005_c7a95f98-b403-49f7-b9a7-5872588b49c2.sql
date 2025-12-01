-- Update subscription_plans with LIVE prices
UPDATE public.subscription_plans
SET stripe_price_id = 'price_1SDC3KRrzAYjX2Dzi1uV4jLH', price_monthly = 9, updated_at = now()
WHERE plan_id = 'starter';

UPDATE public.subscription_plans
SET stripe_price_id = 'price_1SDC3LRrzAYjX2DzsvrdpWdd', price_monthly = 49, updated_at = now()
WHERE plan_id = 'pro';

UPDATE public.subscription_plans
SET stripe_price_id = 'price_1SDC3MRrzAYjX2Dz7feEIhPZ', price_monthly = 99, updated_at = now()
WHERE plan_id = 'business';