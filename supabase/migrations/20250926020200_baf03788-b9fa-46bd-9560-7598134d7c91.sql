-- Actualizar los price_id de Stripe en los planes
UPDATE public.subscription_plans SET stripe_price_id = 'price_1SBQy8RrzAYjX2Dzge7MdAXD' WHERE plan_id = 'starter';
UPDATE public.subscription_plans SET stripe_price_id = 'price_1SBQyWRrzAYjX2Dz1i4NMfri' WHERE plan_id = 'pro';
UPDATE public.subscription_plans SET stripe_price_id = 'price_1SBQyjRrzAYjX2Dz7lT2KxQK' WHERE plan_id = 'business';