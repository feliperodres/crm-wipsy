-- Habilitar RLS en tablas que faltan (shopify_integrations, webhook_events)
ALTER TABLE public.shopify_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Verificar que todas las tablas importantes tengan RLS habilitado
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('n8n_chat_histories') -- Excluir tablas que no necesitan RLS
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', rec.schemaname, rec.tablename);
    END LOOP;
END $$;