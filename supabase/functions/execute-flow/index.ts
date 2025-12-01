import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlowStep {
  id: string;
  step_order: number;
  step_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'delay' | 'ai_function';
  content: string | null;
  media_url: string | null;
  delay_seconds: number;
  ai_prompt: string | null;
  ai_config: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { flowId, customerId, chatId, userId, triggerType = 'manual' } = await req.json();

    if (!flowId || !customerId || !chatId || !userId) {
      throw new Error('Missing required parameters: flowId, customerId, chatId, userId');
    }

    console.log(`[Execute Flow] Starting flow ${flowId} for customer ${customerId} (trigger: ${triggerType})`);

    // Create flow execution record
    const { data: execution, error: execError } = await supabase
      .from('flow_executions')
      .insert({
        flow_id: flowId,
        user_id: userId,
        customer_id: customerId,
        chat_id: chatId,
        status: 'running',
        trigger_type: triggerType,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (execError) {
      console.error('[Execute Flow] Error creating execution:', execError);
      throw execError;
    }

    // Get flow steps ordered
    const { data: steps, error: stepsError } = await supabase
      .from('flow_steps')
      .select('*')
      .eq('flow_id', flowId)
      .order('step_order', { ascending: true });

    if (stepsError) {
      console.error('[Execute Flow] Error fetching steps:', stepsError);
      await supabase
        .from('flow_executions')
        .update({ status: 'failed', error_message: stepsError.message, completed_at: new Date().toISOString() })
        .eq('id', execution.id);
      throw stepsError;
    }

    if (!steps || steps.length === 0) {
      console.log('[Execute Flow] No steps found for flow');
      await supabase
        .from('flow_executions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', execution.id);
      return new Response(JSON.stringify({ success: true, stepsExecuted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get WhatsApp credentials
    const { data: credentials } = await supabase
      .from('whatsapp_meta_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (!credentials) {
      throw new Error('No WhatsApp Meta credentials found for user');
    }

    // Get customer info for phone number
    const { data: customer } = await supabase
      .from('customers')
      .select('phone, whatsapp_id')
      .eq('id', customerId)
      .single();

    if (!customer || !customer.whatsapp_id) {
      throw new Error('Customer WhatsApp ID not found');
    }

    const recipientPhone = customer.whatsapp_id;

    // Execute each step sequentially
    let stepsExecuted = 0;
    for (const step of steps as FlowStep[]) {
      try {
        console.log(`[Execute Flow] Executing step ${step.step_order}: ${step.step_type}`);

        // Handle delay
        if (step.step_type === 'delay' && step.delay_seconds > 0) {
          console.log(`[Execute Flow] Waiting ${step.delay_seconds} seconds`);
          await new Promise(resolve => setTimeout(resolve, step.delay_seconds * 1000));
          stepsExecuted++;
          continue;
        }

        // Prepare message based on step type
        let messagePayload: any = {
          to: recipientPhone,
          phoneNumberId: credentials.phone_number_id,
          chatId: chatId,
        };

        // Handle multiple images if present
        if (step.step_type === 'image' && step.media_url) {
          let imageUrls: string[] = [];
          try {
            const parsed = JSON.parse(step.media_url);
            imageUrls = Array.isArray(parsed) ? parsed : [step.media_url];
          } catch {
            imageUrls = [step.media_url];
          }

          // Send each image separately
          for (let i = 0; i < imageUrls.length; i++) {
            const imagePayload = {
              to: recipientPhone,
              phoneNumberId: credentials.phone_number_id,
              chatId: chatId,
              type: 'image',
              mediaUrl: imageUrls[i],
              caption: i === 0 ? (step.content || '') : '', // Only first image has caption
            };

            const { error: sendError } = await supabase.functions.invoke('send-whatsapp-meta-message', {
              body: imagePayload,
            });

            if (sendError) {
              console.error(`[Execute Flow] Error sending image ${i + 1}/${imageUrls.length} for step ${step.step_order}:`, sendError);
              throw sendError;
            }

            console.log(`[Execute Flow] Successfully sent image ${i + 1}/${imageUrls.length} for step ${step.step_order}`);
            
            // Small delay between images
            if (i < imageUrls.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          stepsExecuted++;
          
        } else {
          // Handle text, video, and single image steps
          switch (step.step_type) {
            case 'text':
              messagePayload.type = 'text';
              messagePayload.message = step.content || '';
              break;

            case 'video':
              messagePayload.type = 'video';
              messagePayload.mediaUrl = step.media_url;
              messagePayload.caption = step.content || '';
              break;

            case 'audio':
              messagePayload.type = 'audio';
              messagePayload.mediaUrl = step.media_url;
              break;

            case 'file':
              // Handle multiple files if present
              let fileUrls: string[] = [];
              try {
                const parsed = JSON.parse(step.media_url || '');
                fileUrls = Array.isArray(parsed) ? parsed : [step.media_url];
              } catch {
                fileUrls = step.media_url ? [step.media_url] : [];
              }

              if (fileUrls.length === 0) break;

              // Send each file separately
              for (let i = 0; i < fileUrls.length; i++) {
                const filePayload = {
                  to: recipientPhone,
                  phoneNumberId: credentials.phone_number_id,
                  chatId: chatId,
                  type: 'document',
                  mediaUrl: fileUrls[i],
                  caption: i === 0 ? (step.content || '') : '', // Only first file has caption
                };

                const { error: sendError } = await supabase.functions.invoke('send-whatsapp-meta-message', {
                  body: filePayload,
                });

                if (sendError) {
                  console.error(`[Execute Flow] Error sending file ${i + 1}/${fileUrls.length} for step ${step.step_order}:`, sendError);
                  throw sendError;
                }

                console.log(`[Execute Flow] Successfully sent file ${i + 1}/${fileUrls.length} for step ${step.step_order}`);
                
                // Small delay between files
                if (i < fileUrls.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
              
              stepsExecuted++;
              continue; // Skip the send below since we already sent
              break;

            case 'ai_function':
              console.log(`[Execute Flow] Executing AI function step ${step.id}`);
              
              // Obtener perfil del usuario con toda la configuración del agente
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

              // Obtener últimos 30 mensajes de la conversación (todos los tipos de mensaje)
              const { data: conversationMessages } = await supabase
                .from('messages')
                .select('id, content, sender_type, message_type, metadata, created_at, timestamp')
                .eq('chat_id', chatId)
                .order('timestamp', { ascending: false, nullsFirst: false })
                .order('created_at', { ascending: false })
                .limit(30);

              // Invertir el orden para que sea cronológico
              const messages = conversationMessages ? conversationMessages.reverse() : [];

              // Obtener información del cliente
              const { data: customerInfo } = await supabase
                .from('customers')
                .select('name, phone, whatsapp_id')
                .eq('id', customerId)
                .single();


              // Obtener tarifas de envío
              const shippingRates = userProfile?.payment_accounts?.shipping_rates || [];

              // Obtener productos destacados
              const { data: featuredProducts } = await supabase
                .from('products')
                .select('id, name, price, images')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(5);

              // Preparar el payload completo para n8n
              const webhookPayload = {
                // Información del usuario/tienda
                userHash: btoa(userProfile?.email || ''),
                userEmail: userProfile?.email || '',
                userId: userId,
                businessName: userProfile?.business_name || '',
                storeInfo: userProfile?.store_info || '',
                website: userProfile?.website || '',
                
                // Configuración del agente IA
                agentName: userProfile?.agent_name || 'Asistente Virtual',
                salesMode: userProfile?.sales_mode || 'advise_only',
                proactivityLevel: userProfile?.proactivity_level || 'reactive',
                customerTreatment: userProfile?.customer_treatment || 'tu',
                welcomeMessage: userProfile?.welcome_message || '',
                callToAction: userProfile?.call_to_action || '',
                specialInstructions: userProfile?.special_instructions || '',
                
                // Métodos de pago
                paymentMethods: userProfile?.payment_methods || 'both',
                paymentAccounts: userProfile?.payment_accounts || [],
                shippingRates: shippingRates,
                
                // Información del cliente
                customerName: customerInfo?.name || '',
                customerPhone: customerInfo?.phone || '',
                customerUid: customerInfo?.whatsapp_id || '',
                
                // Contexto de la conversación
                chatId: chatId,
                customerId: customerId,
                conversationHistory: messages.map(msg => ({
                  id: msg.id,
                  content: msg.content,
                  senderType: msg.sender_type,
                  messageType: msg.message_type,
                  timestamp: msg.timestamp || msg.created_at,
                  metadata: msg.metadata,
                  // Información de mensaje citado si existe
                  quotedMessage: msg.metadata?.quoted_message ? {
                    id: msg.metadata.quoted_message.id,
                    content: msg.metadata.quoted_message.body || msg.metadata.quoted_message.content,
                    senderType: msg.metadata.quoted_message.fromMe ? 'agent' : 'customer',
                  } : null,
                })),
                
                // Prompt de la función IA
                aiPrompt: step.ai_prompt || 'Analiza la conversación y responde de manera apropiada',
                aiConfig: step.ai_config || {},
                
                // Productos destacados
                featuredProducts: featuredProducts || [],
                
                // Metadatos adicionales
                flowId: flowId,
                stepId: step.id,
                triggerType: triggerType,
                timestamp: new Date().toISOString(),
              };

              console.log('[Execute Flow] Sending AI function data to n8n webhook');
              console.log('[Execute Flow] Conversation messages count:', messages.length);
              
              // Enviar al webhook de n8n
              const webhookResponse = await fetch('https://n8n-n8n.uefo06.easypanel.host/webhook/e67a983b-7b75-42fa-b068-1b5d1824c741', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookPayload),
              });

              if (!webhookResponse.ok) {
                const errorText = await webhookResponse.text();
                console.error('[Execute Flow] Webhook error:', webhookResponse.status, errorText);
                throw new Error(`Webhook failed: ${webhookResponse.status} - ${errorText}`);
              }

              const webhookResult = await webhookResponse.json();
              console.log('[Execute Flow] Webhook response:', webhookResult);
              
              stepsExecuted++;
              continue;

            default:
              console.log(`[Execute Flow] Unknown step type: ${step.step_type}`);
              continue;
          }

          // Send message via Meta API
          const { error: sendError } = await supabase.functions.invoke('send-whatsapp-meta-message', {
            body: messagePayload,
          });

          if (sendError) {
            console.error(`[Execute Flow] Error sending message for step ${step.step_order}:`, sendError);
            throw sendError;
          }

          console.log(`[Execute Flow] Successfully sent step ${step.step_order}`);
          stepsExecuted++;
        }

        // Add a small delay between messages to avoid rate limiting
        if (step.step_order < steps.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (stepError) {
        console.error(`[Execute Flow] Error in step ${step.step_order}:`, stepError);
        await supabase
          .from('flow_executions')
          .update({
            status: 'failed',
            error_message: `Failed at step ${step.step_order}: ${stepError.message}`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', execution.id);
        throw stepError;
      }
    }

    // Mark execution as completed
    await supabase
      .from('flow_executions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', execution.id);

    console.log(`[Execute Flow] Completed flow ${flowId}, executed ${stepsExecuted} steps`);

    return new Response(
      JSON.stringify({ success: true, stepsExecuted, executionId: execution.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Execute Flow] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
