-- 1. Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    business_name,
    phone,
    email,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    business_name = COALESCE(EXCLUDED.business_name, profiles.business_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- 2. Trigger para ejecutar la función
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Migrar datos históricos (usuarios existentes)
UPDATE public.profiles p
SET 
  business_name = COALESCE(p.business_name, au.raw_user_meta_data->>'business_name'),
  phone = COALESCE(p.phone, au.raw_user_meta_data->>'phone'),
  email = COALESCE(p.email, au.email),
  updated_at = NOW()
FROM auth.users au
WHERE p.user_id = au.id
  AND (p.business_name IS NULL OR p.phone IS NULL OR p.email IS NULL);