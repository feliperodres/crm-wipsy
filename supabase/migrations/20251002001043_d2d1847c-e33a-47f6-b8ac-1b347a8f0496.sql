-- Create table for storing user Evolution API credentials
CREATE TABLE IF NOT EXISTS public.whatsapp_evolution_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_evolution_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own credentials"
  ON public.whatsapp_evolution_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credentials"
  ON public.whatsapp_evolution_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
  ON public.whatsapp_evolution_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
  ON public.whatsapp_evolution_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_whatsapp_evolution_credentials_user_id ON public.whatsapp_evolution_credentials(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_evolution_credentials_updated_at
  BEFORE UPDATE ON public.whatsapp_evolution_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();