-- Create tags table
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create policies for tags
CREATE POLICY "Users can view their own tags" 
ON public.tags 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" 
ON public.tags 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" 
ON public.tags 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create customer_tags relationship table
CREATE TABLE public.customer_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, tag_id)
);

-- Enable RLS on customer_tags
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_tags
CREATE POLICY "Users can view their own customer tags" 
ON public.customer_tags 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own customer tags" 
ON public.customer_tags 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customer tags" 
ON public.customer_tags 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at on tags
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();