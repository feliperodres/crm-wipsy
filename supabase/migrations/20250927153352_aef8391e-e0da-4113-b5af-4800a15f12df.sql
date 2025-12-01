-- Update subscription plans with production Stripe price IDs
UPDATE subscription_plans 
SET stripe_price_id = 'price_1SC04FRrzAYjX2DzqPBKbf24'
WHERE plan_id = 'starter';

UPDATE subscription_plans 
SET stripe_price_id = 'price_1SC07cRrzAYjX2DzflSlsb0v'
WHERE plan_id = 'pro';

UPDATE subscription_plans 
SET stripe_price_id = 'price_1SC07xRrzAYjX2Dz8Fv2MrCU'
WHERE plan_id = 'business';