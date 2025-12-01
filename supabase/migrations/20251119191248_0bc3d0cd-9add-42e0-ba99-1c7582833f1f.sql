-- Create automation_flows table
CREATE TABLE IF NOT EXISTS public.automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  flow_type TEXT NOT NULL DEFAULT 'welcome',
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_conditions JSONB DEFAULT '{"on_first_message": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create flow_steps table
CREATE TABLE IF NOT EXISTS public.flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL, -- 'text', 'image', 'video', 'delay'
  content TEXT,
  media_url TEXT,
  delay_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create flow_executions table for analytics
CREATE TABLE IF NOT EXISTS public.flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_automation_flows_user_id ON public.automation_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_flows_active ON public.automation_flows(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flow_steps_flow_id ON public.flow_steps(flow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON public.flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_customer_id ON public.flow_executions(customer_id);

-- Enable RLS
ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_flows
CREATE POLICY "Users can view their own flows"
  ON public.automation_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flows"
  ON public.automation_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flows"
  ON public.automation_flows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flows"
  ON public.automation_flows FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for flow_steps
CREATE POLICY "Users can view steps of their flows"
  ON public.flow_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.automation_flows
    WHERE automation_flows.id = flow_steps.flow_id
    AND automation_flows.user_id = auth.uid()
  ));

CREATE POLICY "Users can create steps in their flows"
  ON public.flow_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.automation_flows
    WHERE automation_flows.id = flow_steps.flow_id
    AND automation_flows.user_id = auth.uid()
  ));

CREATE POLICY "Users can update steps in their flows"
  ON public.flow_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.automation_flows
    WHERE automation_flows.id = flow_steps.flow_id
    AND automation_flows.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete steps from their flows"
  ON public.flow_steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.automation_flows
    WHERE automation_flows.id = flow_steps.flow_id
    AND automation_flows.user_id = auth.uid()
  ));

-- RLS Policies for flow_executions
CREATE POLICY "Users can view their own flow executions"
  ON public.flow_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create flow executions"
  ON public.flow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);