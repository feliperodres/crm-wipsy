-- Create table to store Shopify integration settings
CREATE TABLE public.shopify_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_domain TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connection_status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_domain)
);

-- Enable Row Level Security
ALTER TABLE public.shopify_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own Shopify integrations" 
ON public.shopify_integrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Shopify integrations" 
ON public.shopify_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Shopify integrations" 
ON public.shopify_integrations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Shopify integrations" 
ON public.shopify_integrations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shopify_integrations_updated_at
BEFORE UPDATE ON public.shopify_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();