// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chatId } = await req.json();
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get messages from the chat
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw new Error(`Error fetching messages: ${messagesError.message}`);
    }

    // Get customer info from the chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        customer_id,
        customers (
          name,
          last_name,
          phone,
          email,
          address,
          city,
          province
        )
      `)
      .eq('id', chatId)
      .single();

    if (chatError) {
      throw new Error(`Error fetching chat: ${chatError.message}`);
    }

    // Get available products with variants
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id, 
        name, 
        description, 
        price,
        product_variants (
          id,
          title,
          option1,
          option2,
          option3,
          price,
          inventory_quantity,
          available
        )
      `)
      .eq('is_active', true);

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    // Format conversation for AI analysis
    const conversationText = messages
      .map(msg => `${msg.sender_type === 'customer' ? 'Cliente' : 'Vendedor'}: ${msg.content}`)
      .join('\n');

    const productsList = products
      .map(p => {
        let productInfo = `- ${p.name} (ID: ${p.id}) - $${p.price} - ${p.description}`;
        
        // Add variant information if available
        if (p.product_variants && p.product_variants.length > 0) {
          const variantsList = p.product_variants
            .filter(v => v.available && v.inventory_quantity > 0)
            .map(v => {
              const options = [v.option1, v.option2, v.option3].filter(Boolean).join(' - ');
              return `    * Variante: ${options} (ID: ${v.id}) - $${v.price}`;
            })
            .join('\n');
          
          if (variantsList) {
            productInfo += `\n${variantsList}`;
          }
        }
        
        return productInfo;
      })
      .join('\n');

    const prompt = `
Analiza la siguiente conversación entre un vendedor y un cliente para extraer información de un posible pedido:

CONVERSACIÓN:
${conversationText}

PRODUCTOS DISPONIBLES:
${productsList}

INFORMACIÓN DEL CLIENTE:
- Nombre: ${(chat.customers as any)?.name || 'No disponible'}
- Apellido: ${(chat.customers as any)?.last_name || 'No disponible'}
- Teléfono: ${(chat.customers as any)?.phone || 'No disponible'}
- Email: ${(chat.customers as any)?.email || 'No disponible'}
- Dirección: ${(chat.customers as any)?.address || 'No disponible'}
- Ciudad: ${(chat.customers as any)?.city || 'No disponible'}
- Provincia: ${(chat.customers as any)?.province || 'No disponible'}

Extrae la siguiente información y devuelve SOLO un JSON válido con esta estructura:
{
  "hasOrderInfo": boolean,
  "customer": {
    "name": string,
    "lastName": string,
    "phone": string,
    "email": string,
    "address": string,
    "city": string,
    "province": string
  },
  "products": [
    {
      "id": string,
      "name": string,
      "quantity": number,
      "price": number,
      "variant_id": string | null,
      "variant_name": string | null
    }
  ],
  "paymentMethod": "Pago Contra Entrega" | "Anticipado" | "",
  "notes": string,
  "confidence": number
}

Instrucciones:
- hasOrderInfo: true si hay evidencia clara de que el cliente quiere hacer un pedido
- Completa la información del cliente con los datos disponibles
- Solo incluye productos que estén claramente mencionados en la conversación
- Para productos con variantes, detecta la variante específica solicitada (color, talla, etc.)
- Si se menciona una variante específica, incluye variant_id y variant_name
- Si no se especifica variante o el producto no tiene variantes, deja variant_id y variant_name como null
- paymentMethod: solo si se menciona explícitamente
- notes: resumen de detalles importantes del pedido incluyendo variantes específicas
- confidence: del 0 al 100, qué tan seguro estás de la información extraída
- Si no hay información de pedido, devuelve hasOrderInfo: false y arrays vacíos
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente especializado en analizar conversaciones comerciales para extraer información de pedidos. Devuelve siempre un JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let responseText = aiResponse.choices[0].message.content;
    
    // Clean the response if it's wrapped in markdown
    responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    
    const analysisResult = JSON.parse(responseText);

    return new Response(
      JSON.stringify({ success: true, analysis: analysisResult }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error analyzing conversation:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to analyze conversation' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});