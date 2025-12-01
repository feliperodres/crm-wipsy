-- Add new personalization fields to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN agent_name TEXT DEFAULT 'Asistente Virtual',
ADD COLUMN proactivity_level TEXT DEFAULT 'reactive' CHECK (proactivity_level IN ('reactive', 'proactive')),
ADD COLUMN customer_treatment TEXT DEFAULT 'tu' CHECK (customer_treatment IN ('tu', 'usted', 'cliente', 'nombre_propio')),
ADD COLUMN welcome_message TEXT DEFAULT 'Hola! Soy tu asistente virtual, ¿en qué puedo ayudarte hoy?',
ADD COLUMN call_to_action TEXT DEFAULT '¿Te gustaría que procese tu pedido?',
ADD COLUMN special_instructions TEXT DEFAULT '';