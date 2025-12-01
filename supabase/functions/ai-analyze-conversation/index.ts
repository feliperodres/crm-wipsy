import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, customerId, userId, prompt } = await req.json();

    console.log('[AI Function] Called:', {
      chatId,
      customerId,
      userId,
      promptLength: prompt?.length,
    });

    if (!chatId || !userId || !prompt) {
      throw new Error('Missing required parameters: chatId, userId, or prompt');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener mensajes de la conversación (últimos 30)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(30);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw messagesError;
    }

    console.log(`Found ${messages?.length || 0} messages in conversation`);

    // Si no hay mensajes, retornar array vacío
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          messages: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatear conversación para el contexto
    const conversationContext = messages
      .map((msg) => {
        const role = msg.sender_type === 'customer' ? 'Cliente' : 'Agente';
        return `${role}: ${msg.content}`;
      })
      .join('\n');

    console.log('Conversation context length:', conversationContext.length);

    // Extraer términos de búsqueda de la conversación (últimos mensajes del cliente)
    const recentCustomerMessages = messages
      .filter(msg => msg.sender_type === 'customer')
      .slice(-3)
      .map(msg => msg.content)
      .join(' ');

    console.log('Search query for vector search:', recentCustomerMessages);

    // Usar búsqueda vectorial para encontrar productos relevantes
    let inventoryContext = '';
    try {
      const { data: vectorSearchData, error: vectorSearchError } = await supabase.functions.invoke('search-products-vector', {
        body: {
          query: recentCustomerMessages,
          userId: userId,
          limit: 5,
          threshold: 0.6
        }
      });

      if (vectorSearchError) {
        console.error('Vector search error:', vectorSearchError);
      } else if (vectorSearchData?.success && vectorSearchData.results?.length > 0) {
        console.log(`Found ${vectorSearchData.results.length} products via vector search`);
        inventoryContext = `\n\nInventario disponible (productos más relevantes):\n${vectorSearchData.results.map((p: any) => {
          const imageUrls = p.images && Array.isArray(p.images) && p.images.length > 0
            ? p.images.map((img: any) => typeof img === 'string' ? img : img.url).join(', ')
            : 'sin imagen';
          return `- ${p.product_name}: $${p.price}${p.product_description ? ` (${p.product_description})` : ''} [Relevancia: ${(p.similarity * 100).toFixed(0)}%] [Imágenes: ${imageUrls}]`;
        }).join('\n')}`;
      }
    } catch (error) {
      console.error('Error calling vector search:', error);
    }

    // System prompt para generar múltiples mensajes con diferentes tipos
    const systemPrompt = `Eres un asistente de ventas experto y amigable. Analiza la conversación con el cliente y genera una respuesta personalizada siguiendo las instrucciones específicas.

IMPORTANTE: Debes responder en formato JSON con un array de mensajes. Cada mensaje puede ser de tipo "text", "image" o "video".

Formato de respuesta:
{
  "messages": [
    { "type": "text", "content": "Texto del mensaje" },
    { "type": "image", "url": "URL de imagen", "caption": "Descripción opcional" },
    { "type": "video", "url": "URL de video", "caption": "Descripción opcional" }
  ]
}

Reglas importantes:
- Puedes enviar uno o múltiples mensajes según sea necesario
- Para text: usa "content" con el texto
- Para image/video: DEBES usar las URLs REALES de las imágenes que te proporcioné en el inventario disponible. NO inventes URLs.
- Responde en español de forma natural y conversacional
- Mantén un tono profesional pero cercano
- Usa emojis con moderación (máximo 2-3 por mensaje de texto)
- Personaliza tu respuesta basándote en lo que el cliente ha dicho
- Si necesitas enviar imágenes de productos, SIEMPRE usa las URLs exactas del inventario que te proporcioné

CRITICAL - IDENTIFICACIÓN DE PRODUCTOS:
- Cuando el cliente muestre interés en un producto (ej: "me gusta", "este quiero", etc.), identifica EXACTAMENTE cuál es analizando:
  1. Los productos que fueron mencionados INMEDIATAMENTE ANTES del mensaje del cliente
  2. Si se mencionaron varios productos juntos, el último mencionado es probablemente al que se refiere
  3. Si el cliente menciona características específicas, busca el producto que coincida con esas características
- NUNCA asumas qué producto le gustó al cliente sin analizar el contexto de la conversación
- Si no estás seguro de cuál producto le interesa, pregunta al cliente para confirmar antes de enviar imágenes`;

    const userPrompt = `Conversación:\n${conversationContext}${inventoryContext}\n\nTarea: ${prompt}`;
    
    console.log('[AI Function] Calling OpenAI with gpt-4o-mini');

    // Llamar a OpenAI
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error('OpenAI API error:', openAiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAiResponse.status}`);
    }

    const openAiData = await openAiResponse.json();
    let aiResponse = openAiData.choices[0].message.content;

    console.log('[AI Function] Raw response length:', aiResponse.length);

    // Limpiar bloques de markdown si existen
    aiResponse = aiResponse.trim();
    if (aiResponse.startsWith('```json')) {
      aiResponse = aiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      console.log('[AI Function] Removed ```json markdown wrapper');
    } else if (aiResponse.startsWith('```')) {
      aiResponse = aiResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      console.log('[AI Function] Removed ``` markdown wrapper');
    }
    aiResponse = aiResponse.trim();

    console.log('[AI Function] Cleaned response length:', aiResponse.length);

    // Parsear la respuesta JSON
    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      if (!parsedResponse.messages || !Array.isArray(parsedResponse.messages)) {
        console.error('[AI Function] Invalid response format, expected messages array');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid AI response format',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[AI Function] Parsed ${parsedResponse.messages.length} messages from AI`);

      return new Response(
        JSON.stringify({
          success: true,
          messages: parsedResponse.messages,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('[AI Function] Failed to parse JSON response:', parseError);
      // Fallback: retornar como un solo mensaje de texto
      return new Response(
        JSON.stringify({
          success: true,
          messages: [{ type: 'text', content: aiResponse }],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in ai-analyze-conversation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
