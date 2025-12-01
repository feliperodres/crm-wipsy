import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, lastMessage } = await req.json();

    if (!chatId || !lastMessage) {
      return new Response(
        JSON.stringify({ error: 'chatId and lastMessage are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get chat context - last 10 messages for context
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch chat context' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get chat info to verify user ownership and get customer details
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        user_id,
        customer:customers(name, phone)
      `)
      .eq('id', chatId)
      .single();

    if (chatError) {
      console.error('Error fetching chat info:', chatError);
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for business context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('store_info')
      .eq('user_id', chat.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    const storeInfo = profile?.store_info || 'tienda en línea';
    const customerName = (chat?.customer as any)?.name || 'Cliente';

    // Build conversation context
    const conversationContext = messages
      ?.reverse()
      .map(msg => `${msg.sender_type === 'customer' ? customerName : 'Negocio'}: ${msg.content}`)
      .join('\n') || '';

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate suggestions using OpenAI
    const prompt = `Eres un asistente que ayuda a dueños de negocio a responder mensajes de WhatsApp de manera profesional y amigable.

Contexto del negocio: ${storeInfo}
Cliente: ${customerName}

Conversación reciente:
${conversationContext}

Último mensaje del cliente: "${lastMessage}"

Genera 3 respuestas sugeridas que sean:
- Profesionales pero amigables
- Específicas al contexto del mensaje
- Útiles para el negocio
- Entre 20-80 caracteres cada una
- En español colombiano

Responde solo con un array JSON de strings con las 3 sugerencias, sin explicaciones adicionales.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07', // Most economical model
        messages: [
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI response:', data);
    
    const content = data.choices?.[0]?.message?.content;
    console.log('OpenAI content:', content);

    // Increment AI message usage for the user
    try {
      const { error: usageError } = await supabase.rpc('increment_ai_message_usage', {
        target_user_id: chat.user_id,
        tokens_used: data.usage?.total_tokens || 1,
        cost_amount: 0.001, // Approximate cost for nano model
        chat_id_param: chatId,
        message_content_param: `AI Chat Suggestions for: ${lastMessage}`
      });
      
      if (usageError) {
        console.error('Error incrementing AI usage:', usageError);
      } else {
        console.log('AI usage incremented successfully');
      }
    } catch (usageError) {
      console.error('Failed to increment AI usage:', usageError);
    }

    let suggestions: string[] = [];
    try {
      if (content && content.trim()) {
        suggestions = JSON.parse(content);
        console.log('Parsed suggestions:', suggestions);
      } else {
        console.log('Empty response from OpenAI, using fallback');
        throw new Error('Empty response');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content, parseError);
      // Fallback suggestions
      suggestions = [
        "¡Hola! ¿En qué puedo ayudarte?",
        "Gracias por contactarnos.",
        "Te ayudo enseguida."
      ];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-chat-suggestions function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});