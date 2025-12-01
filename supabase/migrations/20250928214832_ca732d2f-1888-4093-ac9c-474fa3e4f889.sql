-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to assign admin role to specific email
CREATE OR REPLACE FUNCTION public.assign_admin_role_to_email(target_email text, target_role app_role DEFAULT 'super_admin')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  -- If user exists, assign role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- RLS policies for user_roles
CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Users can view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Assign super_admin role to felipe.rodres@gmail.com
SELECT public.assign_admin_role_to_email('felipe.rodres@gmail.com', 'super_admin');

-- Create admin analytics functions
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  active_users_this_month bigint,
  total_ai_messages bigint,
  total_chats bigint,
  total_orders bigint,
  total_revenue numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= date_trunc('month', now())) as active_users_this_month,
    (SELECT COUNT(*) FROM ai_message_logs) as total_ai_messages,
    (SELECT COUNT(*) FROM chats) as total_chats,
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COALESCE(SUM(total), 0) FROM orders) as total_revenue;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_user_details()
RETURNS TABLE(
  user_id uuid,
  email text,
  business_name text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  total_chats bigint,
  total_ai_messages bigint,
  total_orders bigint,
  subscription_status text,
  subscription_plan text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id as user_id,
    au.email,
    p.business_name,
    au.created_at,
    au.last_sign_in_at,
    (SELECT COUNT(*) FROM chats WHERE user_id = au.id) as total_chats,
    (SELECT COUNT(*) FROM ai_message_logs WHERE user_id = au.id) as total_ai_messages,
    (SELECT COUNT(*) FROM orders WHERE user_id = au.id) as total_orders,
    COALESCE(us.status, 'free') as subscription_status,
    COALESCE(us.plan_id, 'free') as subscription_plan
  FROM auth.users au
  LEFT JOIN profiles p ON p.user_id = au.id
  LEFT JOIN user_subscriptions us ON us.user_id = au.id
  ORDER BY au.created_at DESC;
$$;