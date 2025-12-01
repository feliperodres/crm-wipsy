-- Add show_whatsapp_button field to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS show_whatsapp_button boolean DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.store_settings.show_whatsapp_button IS 'Whether to show the floating WhatsApp button in the public store';