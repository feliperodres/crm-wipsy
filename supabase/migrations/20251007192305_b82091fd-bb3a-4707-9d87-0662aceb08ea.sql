-- Update Pro plan price from 49 to 59
UPDATE public.subscription_plans
SET price_monthly = 59,
    updated_at = now()
WHERE plan_id = 'pro' AND price_monthly = 49;