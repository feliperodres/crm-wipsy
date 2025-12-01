-- Ensure RPC is callable by public roles
GRANT EXECUTE ON FUNCTION public.get_store_public_options(text) TO anon, authenticated, service_role;