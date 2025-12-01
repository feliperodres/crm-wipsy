-- Crear tabla de planes de suscripción
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  max_products INTEGER NOT NULL DEFAULT 0,
  max_ai_messages INTEGER NOT NULL DEFAULT 0,
  extra_message_cost NUMERIC DEFAULT NULL,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar los planes definidos
INSERT INTO public.subscription_plans (plan_id, name, price_monthly, max_products, max_ai_messages, extra_message_cost, stripe_price_id) VALUES
('free', 'Gratis', 0, 20, 100, NULL, NULL),
('starter', 'Starter', 7, 30, 500, 0.005, NULL),
('pro', 'Pro', 47, 200, 3500, 0.004, NULL),
('business', 'Business', 97, 500, 7500, 0.0035, NULL);

-- Crear tabla de suscripciones de usuario
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(plan_id),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para contadores de uso mensual
CREATE TABLE public.usage_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  ai_messages_used INTEGER NOT NULL DEFAULT 0,
  extra_messages_purchased INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Crear tabla para tracking de mensajes AI
CREATE TABLE public.ai_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chat_id UUID,
  message_content TEXT,
  tokens_used INTEGER,
  cost NUMERIC(10,6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_message_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para subscription_plans (solo lectura pública)
CREATE POLICY "Everyone can view subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- Políticas para user_subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas para usage_counters
CREATE POLICY "Users can view their own usage counters" 
ON public.usage_counters 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own usage counters" 
ON public.usage_counters 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage counters" 
ON public.usage_counters 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas para ai_message_logs
CREATE POLICY "Users can view their own AI message logs" 
ON public.ai_message_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI message logs" 
ON public.ai_message_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Crear función para obtener el plan actual del usuario
CREATE OR REPLACE FUNCTION public.get_user_current_plan(target_user_id UUID)
RETURNS TABLE(
  plan_id TEXT,
  plan_name TEXT,
  max_products INTEGER,
  max_ai_messages INTEGER,
  extra_message_cost NUMERIC,
  subscription_status TEXT,
  period_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.plan_id,
    sp.name as plan_name,
    sp.max_products,
    sp.max_ai_messages,
    sp.extra_message_cost,
    COALESCE(us.status, 'free') as subscription_status,
    us.current_period_end
  FROM public.subscription_plans sp
  LEFT JOIN public.user_subscriptions us ON sp.plan_id = us.plan_id 
    AND us.user_id = target_user_id 
    AND us.status = 'active'
    AND (us.current_period_end IS NULL OR us.current_period_end > now())
  WHERE sp.plan_id = COALESCE(
    (SELECT us2.plan_id FROM public.user_subscriptions us2 
     WHERE us2.user_id = target_user_id 
     AND us2.status = 'active'
     AND (us2.current_period_end IS NULL OR us2.current_period_end > now())
     LIMIT 1), 
    'free'
  )
  LIMIT 1;
END;
$$;

-- Crear función para obtener el uso actual del usuario
CREATE OR REPLACE FUNCTION public.get_user_current_usage(target_user_id UUID)
RETURNS TABLE(
  ai_messages_used INTEGER,
  extra_messages_purchased INTEGER,
  products_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM now());
  current_month INTEGER := EXTRACT(MONTH FROM now());
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uc.ai_messages_used, 0) as ai_messages_used,
    COALESCE(uc.extra_messages_purchased, 0) as extra_messages_purchased,
    (SELECT COUNT(*)::INTEGER FROM public.products WHERE user_id = target_user_id AND is_active = true) as products_count
  FROM public.usage_counters uc
  WHERE uc.user_id = target_user_id 
    AND uc.year = current_year 
    AND uc.month = current_month
  UNION ALL
  SELECT 0, 0, (SELECT COUNT(*)::INTEGER FROM public.products WHERE user_id = target_user_id AND is_active = true) as products_count
  WHERE NOT EXISTS (
    SELECT 1 FROM public.usage_counters uc2 
    WHERE uc2.user_id = target_user_id 
      AND uc2.year = current_year 
      AND uc2.month = current_month
  )
  LIMIT 1;
END;
$$;

-- Crear función para incrementar contador de mensajes AI
CREATE OR REPLACE FUNCTION public.increment_ai_message_usage(target_user_id UUID, tokens_used INTEGER DEFAULT 1, cost_amount NUMERIC DEFAULT 0, chat_id_param UUID DEFAULT NULL, message_content_param TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM now());
  current_month INTEGER := EXTRACT(MONTH FROM now());
BEGIN
  -- Insertar log del mensaje
  INSERT INTO public.ai_message_logs (user_id, chat_id, message_content, tokens_used, cost, created_at)
  VALUES (target_user_id, chat_id_param, message_content_param, tokens_used, cost_amount, now());
  
  -- Incrementar contador de uso
  INSERT INTO public.usage_counters (user_id, year, month, ai_messages_used)
  VALUES (target_user_id, current_year, current_month, 1)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET 
    ai_messages_used = usage_counters.ai_messages_used + 1,
    updated_at = now();
    
  RETURN TRUE;
END;
$$;

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();