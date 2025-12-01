-- Limpiar todos los campos relacionados con Stripe de la base de datos

-- Limpiar stripe_price_id de subscription_plans
UPDATE public.subscription_plans 
SET stripe_price_id = NULL;

-- Limpiar campos de Stripe de user_subscriptions
UPDATE public.user_subscriptions 
SET stripe_customer_id = NULL,
    stripe_subscription_id = NULL;