-- Add whatsapp_number field to store_settings table
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add comment to explain the new field
COMMENT ON COLUMN public.store_settings.whatsapp_number IS 'WhatsApp number for customer inquiries and orders from the public store';

