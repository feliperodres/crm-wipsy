-- Agregar campo para tiempo de buffer en profiles
ALTER TABLE public.profiles 
ADD COLUMN message_buffer_seconds integer DEFAULT 3 CHECK (message_buffer_seconds >= 0 AND message_buffer_seconds <= 30);

-- Crear tabla para buffer de mensajes
CREATE TABLE IF NOT EXISTS public.message_buffer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  message_content text NOT NULL,
  message_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed boolean DEFAULT false
);

-- Índices para mejorar performance
CREATE INDEX idx_message_buffer_customer ON public.message_buffer(customer_id, processed);
CREATE INDEX idx_message_buffer_created ON public.message_buffer(created_at);

-- RLS policies
ALTER TABLE public.message_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message buffer"
  ON public.message_buffer FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own message buffer"
  ON public.message_buffer FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message buffer"
  ON public.message_buffer FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message buffer"
  ON public.message_buffer FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.message_buffer IS 'Tabla temporal para agrupar mensajes de texto antes de enviarlos al agente AI';
COMMENT ON COLUMN public.profiles.message_buffer_seconds IS 'Tiempo en segundos para agrupar mensajes de texto consecutivos (0-30 segundos)';