-- Add payment methods configuration to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS payment_methods jsonb DEFAULT '{"cash_on_delivery": true, "bank_transfer": true, "instructions": "Para transferencias, nos contactaremos contigo después del pedido para coordinar el pago."}'::jsonb;