-- Update subscription plans with new pricing
UPDATE subscription_plans 
SET stripe_price_id = 'price_1SC09LRrzAYjX2DzUa0deEtV', price_monthly = 9.00
WHERE plan_id = 'starter';

UPDATE subscription_plans 
SET stripe_price_id = 'price_1SC09ZRrzAYjX2DzIkigacmO', price_monthly = 49.00
WHERE plan_id = 'pro';

UPDATE subscription_plans 
SET stripe_price_id = 'price_1SC09kRrzAYjX2DzqLNJahOi', price_monthly = 99.00
WHERE plan_id = 'business';