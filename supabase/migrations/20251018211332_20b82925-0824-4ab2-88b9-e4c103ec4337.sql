-- Crear tabla para credenciales de Meta WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_meta_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Datos recibidos del Embedded Signup
  phone_number_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  
  -- Información del negocio
  business_name TEXT,
  phone_number TEXT,
  display_name TEXT,
  
  -- Configuración
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  
  -- Webhooks
  webhook_url TEXT,
  verify_token TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  token_expires_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(user_id, phone_number_id)
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_meta_credentials ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own Meta credentials"
  ON public.whatsapp_meta_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Meta credentials"
  ON public.whatsapp_meta_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Meta credentials"
  ON public.whatsapp_meta_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Meta credentials"
  ON public.whatsapp_meta_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Admins pueden ver todas las credenciales
CREATE POLICY "Admins can view all Meta credentials"
  ON public.whatsapp_meta_credentials FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update all Meta credentials"
  ON public.whatsapp_meta_credentials FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger para asegurar solo una instancia predeterminada
CREATE TRIGGER ensure_single_default_meta_instance
  BEFORE INSERT OR UPDATE ON public.whatsapp_meta_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_instance();

-- Índices para mejorar el rendimiento
CREATE INDEX idx_whatsapp_meta_user_id ON public.whatsapp_meta_credentials(user_id);
CREATE INDEX idx_whatsapp_meta_phone_id ON public.whatsapp_meta_credentials(phone_number_id);
CREATE INDEX idx_whatsapp_meta_waba_id ON public.whatsapp_meta_credentials(waba_id);