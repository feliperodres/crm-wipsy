-- Create whatsapp_templates table for managing Meta message templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,
  template_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED', 'DELETED')),
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_template_per_user UNIQUE(user_id, name, language)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_user ON public.whatsapp_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON public.whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_waba ON public.whatsapp_templates(waba_id);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own templates
CREATE POLICY "Users can view their own templates"
  ON public.whatsapp_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.whatsapp_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.whatsapp_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.whatsapp_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_templates_updated_at();