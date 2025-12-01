import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { customerId, userId } = await req.json();
    
    console.log('Processing grouped messages for customer:', customerId);

    // Obtener todos los mensajes pendientes del buffer
    const { data: bufferedMessages, error: fetchError } = await supabase
      .from('message_buffer')
      .select('*')
      .eq('customer_id', customerId)
      .eq('processed', false)
      .order('message_timestamp', { ascending: true });

    if (fetchError) {
      console.error('Error fetching buffered messages:', fetchError);
      throw fetchError;
    }

    if (!bufferedMessages || bufferedMessages.length === 0) {
      console.log('No buffered messages found');
      return new Response(
        JSON.stringify({ message: 'No messages to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${bufferedMessages.length} buffered messages`);

    // Combinar los mensajes con timestamps para el agente IA
    const groupedContentForAI = bufferedMessages.map(msg => {
      const timestamp = new Date(msg.message_timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      let messageText = `[${timestamp}] ${msg.message_content}`;
      
      // Add quoted message info if exists
      if (msg.metadata?.quotedMessage) {
        const quoted = msg.metadata.quotedMessage;
        if (quoted.type === 'text') {
          messageText += `\n(Citando mensaje anterior: "${quoted.content}")`;
        } else if (quoted.type === 'image') {
          messageText += `\n(Citando imagen${quoted.caption ? ': ' + quoted.caption : ''})`;
        }
      }
      
      return messageText;
    }).join('\n\n');

    // Combinar los mensajes SIN timestamps para el chat (display limpio)
    const groupedContentForChat = bufferedMessages
      .map(msg => msg.message_content)
      .join('\n');

    const chatId = bufferedMessages[0].chat_id;

    // Obtener información del perfil para enviar al webhook
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Extraer productos destacados del special_instructions
    // Extraer productos destacados del special_instructions (UUIDs, shopify_id, handles)
    let uuidIds: string[] = [];
    let shopifyIds: string[] = [];
    let handles: string[] = [];

    const isUuid = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

    const pushVal = (raw: any) => {
      if (!raw) return;
      if (Array.isArray(raw)) {
        raw.forEach(pushVal);
        return;
      }
      if (typeof raw === 'object') {
        const cands = [
          (raw as any).id,
          (raw as any).product_id,
          (raw as any).productId,
          (raw as any).shopify_id,
          (raw as any).shopifyId,
          (raw as any).handle,
          (raw as any).shopify_handle,
        ];
        cands.forEach(pushVal);
        return;
      }
      const s = String(raw).trim();
      if (!s) return;
      if (isUuid(s)) uuidIds.push(s);
      else if (/^[0-9]+$/.test(s)) shopifyIds.push(s);
      else handles.push(s);
    };

    if (profile?.special_instructions) {
      try {
        const parsed = JSON.parse(profile.special_instructions);
        // Buscar en múltiples posibles llaves
        const candidates = [
          (parsed as any).featured_products,
          (parsed as any).featuredProducts,
          (parsed as any).selected_products,
          (parsed as any).selectedProducts,
          (parsed as any).products,
          (parsed as any).featured,
        ];
        candidates.forEach(pushVal);
      } catch {
        // Si no es JSON válido, intentar como lista separada por comas/espacios
        String(profile.special_instructions)
          .split(/[\s,;]+/)
          .forEach(pushVal);
      }
    }

    // Normalizar y unificar
    uuidIds = Array.from(new Set(uuidIds));
    shopifyIds = Array.from(new Set(shopifyIds));
    handles = Array.from(new Set(handles));

    // Obtener detalles de los productos destacados desde múltiples claves
    let featuredProducts: any[] = [];
    console.log('Featured product search sets:', {
      uuidIdsCount: uuidIds.length,
      shopifyIdsCount: shopifyIds.length,
      handlesCount: handles.length,
    });

    if (uuidIds.length + shopifyIds.length + handles.length > 0) {
      const queries: Promise<any>[] = [];
      if (uuidIds.length > 0) {
        queries.push(
          supabase
            .from('products')
            .select('id, name, price, images')
            .in('id', uuidIds)
        );
      }
      if (shopifyIds.length > 0) {
        queries.push(
          supabase
            .from('products')
            .select('id, name, price, images')
            .in('shopify_id', shopifyIds)
        );
      }
      if (handles.length > 0) {
        queries.push(
          supabase
            .from('products')
            .select('id, name, price, images')
            .in('shopify_handle', handles)
        );
      }

      const results = await Promise.all(queries);
      const byId = new Map<string, any>();
      for (const r of results) {
        if (r?.data) {
          for (const p of r.data) {
            if (!byId.has(p.id)) byId.set(p.id, p);
          }
        } else if (r?.error) {
          console.error('Error fetching featured products subset:', r.error);
        }
      }
      featuredProducts = Array.from(byId.values());
      console.log(`Found ${featuredProducts.length} featured products:`, featuredProducts.map((p: any) => p.name));
    } else {
      console.log('No featured products configured in profile');
    }

    // Obtener información del customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    // Obtener las tarifas de envío de la tienda
    const { data: storeData } = await supabase
      .from('store_settings')
      .select('shipping_rates')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    // Parse shipping rates
    let shippingRates = [];
    if (storeData?.shipping_rates) {
      try {
        if (Array.isArray(storeData.shipping_rates)) {
          shippingRates = storeData.shipping_rates;
        } else if (typeof storeData.shipping_rates === 'string') {
          shippingRates = JSON.parse(storeData.shipping_rates);
        }
      } catch (error) {
        console.error('Error parsing shipping rates:', error);
      }
    }

    // NO crear un mensaje agrupado en la base de datos
    // Los mensajes individuales ya fueron creados y se muestran en el chat
    // Solo enviaremos el contenido agrupado al agente IA
    console.log('Skipping message creation - individual messages already in chat');

    // Marcar mensajes como procesados
    const { error: updateError } = await supabase
      .from('message_buffer')
      .update({ processed: true })
      .eq('customer_id', customerId)
      .eq('processed', false);

    if (updateError) {
      console.error('Error marking messages as processed:', updateError);
    }

    // Incrementar uso de IA
    const { data: usageData } = await supabase.functions.invoke('increment-ai-usage', {
      body: {
        user_id: userId,
        chat_id: chatId,
        message_content: groupedContentForAI
      }
    });

    console.log('AI usage incremented:', usageData);

    // Buscar el mensaje citado más reciente en los mensajes bufferados
    let quotedInfo = null;
    for (let i = bufferedMessages.length - 1; i >= 0; i--) {
      if (bufferedMessages[i].metadata?.quotedMessage) {
        quotedInfo = bufferedMessages[i].metadata.quotedMessage;
        break;
      }
    }

    // Buscar si hay imágenes o audios en los mensajes bufferados
    let imageUrl = null;
    let audioUrl = null;
    for (const msg of bufferedMessages) {
      if (msg.metadata?.imageUrl && !imageUrl) {
        imageUrl = msg.metadata.imageUrl;
      }
      if (msg.metadata?.audioUrl && !audioUrl) {
        audioUrl = msg.metadata.audioUrl;
      }
    }

    console.log('Media found in buffered messages - Image:', !!imageUrl, 'Audio:', !!audioUrl);

    // Enviar al webhook del agente IA (con timestamps para contexto temporal)
    const webhookPayload = {
      userEmail: profile?.email,
      userId,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      customerUid: customerId,
      messageContent: groupedContentForAI,
      messageType: imageUrl ? 'image' : (audioUrl ? 'audio' : 'text'),
      storeInfo: profile?.store_info,
      salesMode: profile?.sales_mode,
      paymentAccounts: profile?.payment_accounts,
      paymentMethods: profile?.payment_methods,
      agentName: profile?.agent_name,
      proactivityLevel: profile?.proactivity_level,
      customerTreatment: profile?.customer_treatment,
      welcomeMessage: profile?.welcome_message,
      callToAction: profile?.call_to_action,
      specialInstructions: profile?.special_instructions,
      website: profile?.website,
      shippingRates: shippingRates,
      userHash: btoa(profile?.email || '').replace(/[+/=]/g, '').substring(0, 16),
      imagen: imageUrl,
      audio: audioUrl,
      quotedMessage: quotedInfo,
      featuredProducts
    };

    console.log('Sending to AI agent webhook...');
    
    const webhookResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-ai-agent-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(webhookPayload)
      }
    );

    if (!webhookResponse.ok) {
      console.error('Webhook response not ok:', await webhookResponse.text());
    } else {
      console.log('Webhook sent successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageCount: bufferedMessages.length,
        groupedContent: groupedContentForChat
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-grouped-messages:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
