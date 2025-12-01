// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userEmail, userId, customerName, customerPhone, customerUid, messageContent, storeInfo, salesMode, paymentAccounts, paymentMethods, storeUrl, userHash, imagen, audio, messageType, quotedMessage, mensaje_agente, celular_destinario, agentName, proactivityLevel, customerTreatment, welcomeMessage, callToAction, specialInstructions, website, shippingRates, featuredProducts } = await req.json()

    console.log('Received webhook data:', {
      userEmail,
      userId,
      customerName,
      customerPhone,
      customerUid,
      messageContent,
      messageType,
      storeInfo,
      salesMode,
      paymentAccounts,
      paymentMethods,
      agentName,
      proactivityLevel,
      customerTreatment,
      welcomeMessage,
      callToAction,
      specialInstructions,
      website,
      userHash,
      hasImagen: !!imagen,
      hasAudio: !!audio,
      mensaje_agente,
      celular_destinario,
      featuredProductsCount: featuredProducts?.length || 0
    })
    
    console.log('Featured products being sent to n8n:', featuredProducts)

    // Check if this is a human intervention request from the AI agent
    if (mensaje_agente && celular_destinario) {
      console.log('AI agent requesting human intervention for:', celular_destinario, 'Message:', mensaje_agente)
      
      // Create Supabase client to disable AI agent for the customer
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      try {
        // Update customer to disable AI agent using celular_destinario and userId to ensure correct account
        const { error: updateError } = await supabase
          .from('customers')
          .update({ ai_agent_enabled: false })
          .eq('phone', celular_destinario)
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error disabling AI agent:', updateError)
        } else {
          console.log('AI agent disabled successfully for customer:', celular_destinario)
        }

        return new Response(
          JSON.stringify({ success: true, message: 'AI agent disabled for customer', phone: celular_destinario }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (error) {
        console.error('Error processing human intervention request:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to disable AI agent' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    if (!userEmail || !userId || !customerName || !customerPhone || !customerUid || !messageContent) {
      console.log('Missing fields:', { 
        hasUserEmail: !!userEmail,
        hasUserId: !!userId,
        hasCustomerName: !!customerName,
        hasCustomerPhone: !!customerPhone,
        hasCustomerUid: !!customerUid,
        hasMessageContent: !!messageContent
      })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client to fetch chat_id
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the chat_id by looking up the customer and chat
    console.log('Looking up chat_id for customer:', customerPhone, customerUid)
    
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('phone', customerPhone)
      .maybeSingle()

    if (customerError) {
      console.error('Error finding customer:', customerError)
      throw new Error(`Customer lookup error: ${customerError.message}`)
    }

    if (!customer) {
      console.error('Customer not found for phone:', customerPhone)
      throw new Error('Customer not found')
    }

    console.log('Found customer:', customer.id)

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('user_id', userId)
      .eq('customer_id', customer.id)
      .maybeSingle()

    if (chatError) {
      console.error('Error finding chat:', chatError)
      throw new Error(`Chat lookup error: ${chatError.message}`)
    }

    if (!chat) {
      console.error('Chat not found for customer:', customer.id)
      throw new Error('Chat not found')
    }

    const actualChatId = chat.id
    console.log('Found chat_id:', actualChatId)

    const webhookUrl = 'https://n8n-n8n.uefo06.easypanel.host/webhook/7bee7552-b814-4a69-84ba-9347db753a51'
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        userId,
        customerName,
        customerPhone,
        customerUid,
        messageContent,
        messageType: messageType || 'text',
        storeInfo: storeInfo || '',
        salesMode: salesMode || 'advise_only',
        paymentAccounts: paymentAccounts || [],
        paymentMethods: paymentMethods || 'both',
        
        // New personalization fields
        agentName: agentName || 'Asistente Virtual',
        proactivityLevel: proactivityLevel || 'reactive',
        customerTreatment: customerTreatment || 'tu',
        welcomeMessage: welcomeMessage || 'Hola! Soy tu asistente virtual, ¿en qué puedo ayudarte hoy?',
        callToAction: callToAction || '¿Te gustaría que procese tu pedido?',
        specialInstructions: specialInstructions || '',
        website: website || '',
        shippingRates: shippingRates || [],
        featuredProducts: featuredProducts || [],
        
        storeUrl: storeUrl || null,
        userHash: userHash || '',
        chatId: actualChatId,
        imagen: imagen || null,
        audio: audio || null,
        quotedMessage: quotedMessage || null,
        timestamp: new Date().toISOString()
      })
    })

    console.log('Webhook response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Webhook error:', errorText)
      throw new Error(`Webhook error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Webhook response:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending AI agent webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})