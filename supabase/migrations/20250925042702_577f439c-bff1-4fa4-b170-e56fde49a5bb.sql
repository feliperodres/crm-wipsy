-- Verificar qué tabla no tiene RLS habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false 
AND tablename != 'n8n_chat_histories';

-- Habilitar RLS en la tabla n8n_chat_histories (que parece ser la que falta)
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Crear una política restrictiva para n8n_chat_histories (solo lectura del sistema)
CREATE POLICY "System only access" 
ON public.n8n_chat_histories 
FOR ALL 
USING (false) 
WITH CHECK (false);