-- Update Pro plan with new Stripe price ID for $59
UPDATE public.subscription_plans
SET stripe_price_id = 'price_1SFncjRrzAYjX2DzG7vbi6OA',
    updated_at = now()
WHERE plan_id = 'pro';