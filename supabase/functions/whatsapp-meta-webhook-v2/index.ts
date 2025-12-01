import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const url = new URL(req.url);
  
  // Verificación inicial del webhook (GET request)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    
    console.log('[Meta V2] Webhook verification request:', { mode, token: token?.substring(0, 10), challenge });
    
    if (mode === 'subscribe' && token) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: credentials, error: queryError } = await supabase
        .from('whatsapp_meta_credentials')
        .select('verify_token, phone_number_id, user_id')
        .eq('verify_token', token)
        .single();
      
      if (queryError) {
        console.error('[Meta V2] Database query error:', queryError);
      }
      
      if (credentials) {
        console.log('[Meta V2] Webhook verified successfully for phone_number_id:', credentials.phone_number_id);
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
      const { data: allTokens } = await supabase
        .from('whatsapp_meta_credentials')
        .select('verify_token, phone_number_id');
      
      console.error('[Meta V2] Token not found. Available tokens:', allTokens?.map(t => ({
        token_preview: t.verify_token?.substring(0, 20) + '...',
        phone_number_id: t.phone_number_id
      })));
    }
    
    console.error('[Meta V2] Webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  }

  // Procesar webhook (POST request)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[Meta V2] Webhook received');
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Procesar cada entrada del webhook
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const value = change.value;
            const messages = value.messages || [];
            const contacts = value.contacts || [];
            const metadata = value.metadata;

            console.log('[Meta V2] Processing messages:', messages.length);

            for (const message of messages) {
              // Detectar si es un mensaje del business (enviado manualmente desde WhatsApp)
              // En Meta API, los mensajes manuales del business no tienen `from` igual al customer
              // Verificamos si es el número del negocio respondiendo
              const isFromBusiness = !message.from || message.from === metadata.phone_number_id || message.from === metadata.display_phone_number;
              
              if (isFromBusiness) {
                console.log('[Meta V2] Business message detected, checking if sent by us...');
                
                // Buscar credenciales
                const { data: credentials } = await supabase
                  .from('whatsapp_meta_credentials')
                  .select('user_id, phone_number_id')
                  .eq('phone_number_id', metadata.phone_number_id)
                  .single();

                if (credentials) {
                  // Verificar si este mensaje existe en nuestra DB (fue enviado por Wipsy)
                  const { data: ourMessage } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('whatsapp_message_id', message.id)
                    .maybeSingle();

                  if (!ourMessage) {
                    // Mensaje manual detectado - NO fue enviado por Wipsy
                    console.log('[Meta V2] 🚨 Manual business reply detected! Saving message and disabling agent...');
                    
                    // 1. Extraer contenido del mensaje
                    let messageContent = '';
                    let messageType = 'text';
                    let mediaMetadata: any = {};
                    
                    if (message.type === 'text') {
                      messageContent = message.text?.body || '';
                    } else if (message.type === 'image') {
                      messageType = 'image';
                      messageContent = message.image?.caption || '[Imagen]';
                      if (message.image?.id) {
                        mediaMetadata.imageId = message.image.id;
                      }
                    } else if (message.type === 'audio') {
                      messageType = 'audio';
                      messageContent = '[Audio]';
                      if (message.audio?.id) {
                        mediaMetadata.audioId = message.audio.id;
                      }
                    } else if (message.type === 'video') {
                      messageType = 'video';
                      messageContent = message.video?.caption || '[Video]';
                      if (message.video?.id) {
                        mediaMetadata.videoId = message.video.id;
                      }
                    } else if (message.type === 'document') {
                      messageType = 'document';
                      messageContent = `[Documento: ${message.document?.filename || 'Sin nombre'}]`;
                      if (message.document?.id) {
                        mediaMetadata.documentId = message.document.id;
                      }
                    }
                    
                    // 2. Buscar el customer (destinatario del mensaje)
                    const customerPhone = message.to;
                    
                    if (customerPhone) {
                      const { data: customer } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('user_id', credentials.user_id)
                        .eq('phone', customerPhone)
                        .single();

                      if (customer) {
                        // 3. Buscar el chat
                        const { data: chat } = await supabase
                          .from('chats')
                          .select('id')
                          .eq('user_id', credentials.user_id)
                          .eq('customer_id', customer.id)
                          .eq('instance_name', `meta_${metadata.phone_number_id}`)
                          .single();

                        if (chat) {
                          // 4. Avoid duplicating messages sent by our API (agent)
                          // Meta may send the outgoing message as a webhook event. If we already
                          // stored it when sending (with whatsapp_message_id), don't insert again
                          // as 'business'. Instead, update status and exit.
                          const { data: existingMessage, error: existingErr } = await supabase
                            .from('messages')
                            .select('id, sender_type, status')
                            .eq('whatsapp_message_id', message.id)
                            .maybeSingle();

                          if (existingErr) {
                            console.error('[Meta V2] Error checking existing message:', existingErr);
                          }

                          if (existingMessage) {
                            // If the original was stored as agent, keep it that way and just update status
                            const { error: updateErr } = await supabase
                              .from('messages')
                              .update({ status: 'sent' })
                              .eq('id', existingMessage.id);

                            if (updateErr) {
                              console.error('[Meta V2] Error updating existing message status:', updateErr);
                            } else {
                              console.log('[Meta V2] ✅ Existing outbound message found, status updated. Skipping duplicate insert.');
                            }
                          } else {
                            // 5. Save manual business message (sent outside our API)
                            const { error: insertError } = await supabase
                              .from('messages')
                              .insert({
                                chat_id: chat.id,
                                content: messageContent,
                                sender_type: 'business',
                                message_type: messageType,
                                whatsapp_message_id: message.id,
                                status: 'sent',
                                metadata: {
                                  manual: true,
                                  source: 'whatsapp_manual',
                                  ...mediaMetadata
                                }
                              });

                            if (insertError) {
                              console.error('[Meta V2] Error inserting manual message:', insertError);
                            } else {
                              console.log('[Meta V2] ✅ Manual message saved to chat');
                            }
                          }

                          // 6. Verificar que disable_agent_on_manual_reply esté habilitado
                          const { data: profile } = await supabase
                            .from('profiles')
                            .select('disable_agent_on_manual_reply')
                            .eq('user_id', credentials.user_id)
                            .single();

                          // 7. Actualizar chat y desactivar agente si está configurado
                          if (profile?.disable_agent_on_manual_reply) {
                            await supabase
                              .from('chats')
                              .update({ 
                                ai_agent_enabled: false,
                                last_message_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', chat.id);

                            await supabase
                              .from('customers')
                              .update({ 
                                ai_agent_enabled: false,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', customer.id);

                            console.log(`[Meta V2] ✅ Agent disabled for customer ${customerPhone} due to manual reply`);
                          } else {
                            // Solo actualizar last_message_at sin desactivar agente
                            await supabase
                              .from('chats')
                              .update({ 
                                last_message_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', chat.id);
                            
                            console.log('[Meta V2] Manual message saved, agent not disabled (setting off)');
                          }
                        } else {
                          console.log(`[Meta V2] Chat not found for customer ${customerPhone}`);
                        }
                      } else {
                        console.log(`[Meta V2] Customer not found for phone: ${customerPhone}`);
                      }
                    }
                  } else {
                    console.log('[Meta V2] Business message was sent by Wipsy, no action needed');
                  }
                }
                
                // No procesar más este mensaje business
                continue;
              }
              
              // Si llegamos aquí, es un mensaje del customer - procesar normalmente
              const { data: credentials } = await supabase
                .from('whatsapp_meta_credentials')
                .select('user_id, phone_number_id')
                .eq('phone_number_id', metadata.phone_number_id)
                .single();

              if (!credentials) {
                console.error('[Meta V2] No credentials found for phone_number_id:', metadata.phone_number_id);
                continue;
              }

              const userId = credentials.user_id;

              // Verificar que el usuario tenga v2 habilitado
              const { data: profile } = await supabase
                .from('profiles')
                .select('use_webhook_v2, message_buffer_v2_seconds')
                .eq('user_id', userId)
                .single();

              if (!profile?.use_webhook_v2) {
                console.log('[Meta V2] V2 not enabled for this user, skipping');
                continue;
              }

              const from = message.from;
              
              // Buscar o crear cliente
              let { data: customer } = await supabase
                .from('customers')
                .select('id')
                .eq('user_id', userId)
                .eq('phone', from)
                .single();

              if (!customer) {
                const contactInfo = contacts.find(c => c.wa_id === from);
                const { data: newCustomer, error: createError } = await supabase
                  .from('customers')
                  .insert({
                    user_id: userId,
                    phone: from,
                    whatsapp_id: from,
                    name: contactInfo?.profile?.name || from,
                    last_seen: new Date().toISOString()
                  })
                  .select('id')
                  .single();

                if (createError) {
                  console.error('[Meta V2] Error creating customer:', createError);
                  continue;
                }
                customer = newCustomer;
              }

              if (!customer) {
                console.error('[Meta V2] Failed to create/find customer');
                continue;
              }

              // Buscar o crear chat
              let { data: chat } = await supabase
                .from('chats')
                .select('id, ai_agent_enabled')
                .eq('user_id', userId)
                .eq('customer_id', customer.id)
                .eq('instance_name', `meta_${metadata.phone_number_id}`)
                .single();

              if (!chat) {
                const { data: newChat, error: createChatError } = await supabase
                  .from('chats')
                  .insert({
                    user_id: userId,
                    customer_id: customer.id,
                    instance_name: `meta_${metadata.phone_number_id}`,
                    whatsapp_chat_id: from,
                    status: 'active',
                    last_message_at: new Date().toISOString(),
                    ai_agent_enabled: true
                  })
                  .select('id, ai_agent_enabled')
                  .single();

                if (createChatError) {
                  console.error('[Meta V2] Error creating chat:', createChatError);
                  continue;
                }
                chat = newChat;
              }

              if (!chat) {
                console.error('[Meta V2] Failed to create/find chat');
                continue;
              }

              // ====== FLOW TRIGGER: Check if first message and execute welcome flow ======
              const { count: messageCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('chat_id', chat.id);

              const isFirstMessage = messageCount === 0;

              if (isFirstMessage) {
                console.log(`[Meta V2] First message detected for chat ${chat.id}, checking for active flows`);
                
                // Buscar flujos activos con trigger de primer mensaje
                const { data: activeFlows } = await supabase
                  .from('automation_flows')
                  .select('id, name, trigger_conditions')
                  .eq('user_id', userId)
                  .eq('is_active', true);

                if (activeFlows && activeFlows.length > 0) {
                  for (const flow of activeFlows) {
                    const conditions = flow.trigger_conditions || {};
                    
                    if (conditions.on_first_message) {
                      // Verificar si ya se ejecutó este flujo para este chat
                      const { data: previousExecution } = await supabase
                        .from('flow_executions')
                        .select('id')
                        .eq('flow_id', flow.id)
                        .eq('chat_id', chat.id)
                        .eq('trigger_type', 'first_message')
                        .maybeSingle();

                      if (previousExecution) {
                        console.log(`[Flow Trigger] Flow "${flow.name}" already executed for this chat, skipping`);
                        continue;
                      }

                      console.log(`[Flow Trigger] Executing flow "${flow.name}" (${flow.id}) for first message`);
                      
                      // Ejecutar flow en background (no esperar respuesta)
                      supabase.functions.invoke('execute-flow', {
                        body: {
                          flowId: flow.id,
                          customerId: customer.id,
                          chatId: chat.id,
                          userId: userId,
                          triggerType: 'first_message',
                        }
                      }).then(result => {
                        if (result.error) {
                          console.error(`[Flow Trigger] Error executing flow ${flow.id}:`, result.error);
                        } else {
                          console.log(`[Flow Trigger] Flow ${flow.id} executed successfully`);
                        }
                      });
                    }
                  }
                }
              }
              // ====== END FLOW TRIGGER ======

              // Preparar contenido del mensaje
              let messageContent = '';
              let messageType = 'text';
              let mediaUrl = null;
              let quotedMessageId = null;
              let quotedMetadata: any = null;
              let mediaMetadata: any = {
                whatsapp_message_id: message.id,
                timestamp: message.timestamp
              };

              // Capturar mensaje citado si existe
              if (message.context?.id) {
                quotedMessageId = message.context.id;
                console.log(`[Meta V2] Quoted message detected: ${message.context.id}`);
                
                // Buscar el mensaje citado en la base de datos
                const { data: quotedMsg } = await supabase
                  .from('messages')
                  .select('content, sender_type, message_type, metadata')
                  .eq('whatsapp_message_id', message.context.id)
                  .maybeSingle();
                
                if (quotedMsg) {
                  quotedMetadata = {
                    type: quotedMsg.message_type,
                    content: quotedMsg.content,
                    sender: quotedMsg.sender_type,
                    imageUrl: quotedMsg.metadata?.imageUrl || null,
                    audioUrl: quotedMsg.metadata?.audioUrl || null
                  };
                  console.log(`[Meta V2] Quoted message found: ${quotedMsg.message_type} from ${quotedMsg.sender_type}`);
                } else {
                  // Si no se encuentra, al menos guardar el ID e inferir el remitente
                  const quotedFrom = message.context?.from || null;
                  const inferredSender = quotedFrom
                    ? (quotedFrom === from ? 'customer' : 'business')
                    : 'unknown';
                  quotedMetadata = {
                    type: 'unknown',
                    content: '[Mensaje citado no encontrado]',
                    sender: inferredSender,
                    id: message.context.id
                  };
                  console.log(`[Meta V2] Quoted message not found for ID: ${message.context.id}`);
                }
              }

              if (message.type === 'text') {
                messageContent = message.text.body;
                messageType = 'text';
              } else if (message.type === 'image') {
                messageType = 'image';
                messageContent = message.image.caption || '[Imagen]';
                mediaUrl = 'pending';
                mediaMetadata.media_id = message.image.id;
                mediaMetadata.mime_type = message.image.mime_type;
              } else if (message.type === 'video') {
                messageType = 'video';
                messageContent = message.video.caption || '[Video]';
                mediaUrl = 'pending';
                mediaMetadata.media_id = message.video.id;
                mediaMetadata.mime_type = message.video.mime_type;
              } else if (message.type === 'audio') {
                messageType = 'audio';
                messageContent = '[Audio]';
                mediaUrl = 'pending';
                mediaMetadata.media_id = message.audio.id;
                mediaMetadata.mime_type = message.audio.mime_type;
              } else if (message.type === 'document') {
                messageType = 'document';
                messageContent = `[Documento: ${message.document.filename || 'Sin nombre'}]`;
                mediaUrl = 'pending';
                mediaMetadata.media_id = message.document.id;
                mediaMetadata.mime_type = message.document.mime_type;
              } else {
                messageContent = `Mensaje de tipo ${message.type}`;
                mediaMetadata.original_type = message.type;
              }

              // Idempotency: skip if this WhatsApp message was already received
              const whatsappId = mediaMetadata.whatsapp_message_id;
              if (whatsappId) {
                // Check queue for existing entry with same WhatsApp ID
                const { data: existingQueue } = await supabase
                  .from('message_queue_v2')
                  .select('id')
                  .eq('chat_id', chat.id)
                  .contains('media_metadata', { whatsapp_message_id: whatsappId })
                  .maybeSingle();

                if (existingQueue) {
                  console.log(`[Meta V2] Duplicate message ignored (queue): ${whatsappId}`);
                  continue;
                }

                // Check messages table as well (in case already persisted)
                const { data: existingMsg } = await supabase
                  .from('messages')
                  .select('id')
                  .eq('chat_id', chat.id)
                  .eq('whatsapp_message_id', whatsappId)
                  .maybeSingle();

                if (existingMsg) {
                  console.log(`[Meta V2] Duplicate message ignored (messages): ${whatsappId}`);
                  continue;
                }
              }

              // Get current group for this customer or create new one
              const now = new Date().toISOString();
              
              // Find existing group that's still active (not sent yet)
              const { data: existingMessages } = await supabase
                .from('message_queue_v2')
                .select('group_id, sequence_number')
                .eq('user_id', userId)
                .eq('customer_id', customer.id)
                .eq('sent_to_webhook', false)
                .order('received_at', { ascending: false })
                .limit(1);

              let groupId;
              let sequenceNumber = 1;

              if (existingMessages && existingMessages.length > 0) {
                // Use existing group and increment sequence
                groupId = existingMessages[0].group_id;
                sequenceNumber = (existingMessages[0].sequence_number || 0) + 1;
              } else {
                // Create new group
                groupId = crypto.randomUUID();
              }

              // Immediately save message to messages table for instant UI display
              const messageInsertData: any = {
                chat_id: chat.id,
                content: messageContent,
                sender_type: 'customer',
                message_type: messageType,
                whatsapp_message_id: mediaMetadata.whatsapp_message_id,
                timestamp: now,
                status: 'received'
              };

              // Add metadata for media/quoted messages
              if (messageType !== 'text' || quotedMetadata) {
                const msgMetadata: any = {};
                if (messageType === 'image' && mediaUrl && mediaUrl !== 'pending') {
                  msgMetadata.imageUrl = mediaUrl;
                }
                if (messageType === 'audio' && mediaUrl && mediaUrl !== 'pending') {
                  msgMetadata.audioUrl = mediaUrl;
                }
                if (quotedMetadata) {
                  msgMetadata.quotedMessage = quotedMetadata;
                }
                if (Object.keys(msgMetadata).length > 0) {
                  messageInsertData.metadata = msgMetadata;
                }
              }

              const { error: messageInsertError } = await supabase
                .from('messages')
                .insert(messageInsertData);

              if (messageInsertError) {
                console.error('[Meta V2] Error inserting message to messages table:', messageInsertError);
              } else {
                console.log(`[Meta V2] Message saved instantly to messages table`);
              }

              // Also insert into queue for agent webhook processing
              const { error: insertError } = await supabase
                .from('message_queue_v2')
                .insert({
                  user_id: userId,
                  customer_id: customer.id,
                  chat_id: chat.id,
                  message_content: messageContent,
                  message_type: messageType,
                  media_url: mediaUrl,
                  media_processed: mediaUrl === null,
                  media_metadata: mediaMetadata,
                  quoted_message_id: quotedMessageId,
                  quoted_metadata: quotedMetadata,
                  group_id: groupId,
                  sequence_number: sequenceNumber,
                  received_at: now,
                  group_last_message_at: now,
                  raw_webhook_data: body
                });

              if (insertError) {
                console.error('[Meta V2] Error inserting message to queue:', insertError);
                continue;
              }

              // Update group_last_message_at for ALL messages in this group
              await supabase
                .from('message_queue_v2')
                .update({ group_last_message_at: now })
                .eq('group_id', groupId)
                .eq('sent_to_webhook', false);

              console.log(`[Meta V2] Message queued - Group: ${groupId}, Seq: ${sequenceNumber}, Type: ${messageType}`);

              // Process media in background if needed
              if (mediaUrl === 'pending') {
                EdgeRuntime.waitUntil(
                  processMediaInBackground(
                    supabase,
                    groupId,
                    sequenceNumber,
                    message,
                    messageType,
                    userId,
                    metadata.phone_number_id
                  )
                );
              }

              // Trigger processor immediately - it handles debounce internally
              supabase.functions.invoke('process-message-queue-v2', {
                body: { groupId }
              }).then(({ error }) => {
                if (error) {
                  console.error('[Meta V2] Error invoking processor:', error);
                } else {
                  console.log(`[Meta V2] Processor invoked for group ${groupId}`);
                }
              });
            }

            // Procesar estados de mensaje si existen
            if (value.statuses) {
              for (const status of value.statuses) {
                // Verificar si este mensaje business existe en nuestra DB
                const { data: ourMessage } = await supabase
                  .from('messages')
                  .select('id, chat_id')
                  .eq('whatsapp_message_id', status.id)
                  .maybeSingle();

                if (!ourMessage) {
                  // Mensaje business NO enviado por nosotros = respuesta manual
                  console.log(`[Meta V2] Manual business message detected: ${status.id}`);
                  
                  // Buscar credenciales para obtener user_id
                  const { data: credentials } = await supabase
                    .from('whatsapp_meta_credentials')
                    .select('user_id')
                    .eq('phone_number_id', metadata.phone_number_id)
                    .single();

                  if (credentials) {
                    // Verificar que disable_agent_on_manual_reply esté habilitado
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('disable_agent_on_manual_reply')
                      .eq('user_id', credentials.user_id)
                      .single();

                    if (profile?.disable_agent_on_manual_reply) {
                      // El recipient_id en status es el número del cliente
                      const customerPhone = status.recipient_id?.replace('@s.whatsapp.net', '');
                      
                      if (customerPhone) {
                        // Buscar customer
                        const { data: customer } = await supabase
                          .from('customers')
                          .select('id')
                          .eq('user_id', credentials.user_id)
                          .eq('phone', customerPhone)
                          .single();

                        if (customer) {
                          // Desactivar agente en chats con este customer
                          const { error: updateChatError } = await supabase
                            .from('chats')
                            .update({ 
                              ai_agent_enabled: false,
                              updated_at: new Date().toISOString()
                            })
                            .eq('user_id', credentials.user_id)
                            .eq('customer_id', customer.id)
                            .eq('instance_name', `meta_${metadata.phone_number_id}`);

                          if (!updateChatError) {
                            // También desactivar en customer
                            await supabase
                              .from('customers')
                              .update({ 
                                ai_agent_enabled: false,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', customer.id);

                            console.log(`[Meta V2] ✅ Agent disabled due to manual reply for customer ${customerPhone}`);
                          } else {
                            console.error('[Meta V2] Error disabling agent:', updateChatError);
                          }
                        }
                      }
                    }
                  }
                }

                // Actualizar status en DB
                await supabase
                  .from('messages')
                  .update({ status: status.status })
                  .eq('whatsapp_message_id', status.id);

                console.log('[Meta V2] Message status updated:', status.id, status.status);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[Meta V2] Error processing webhook:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

// Process media in background
async function processMediaInBackground(
  supabase: any,
  groupId: string,
  sequenceNumber: number,
  message: any,
  messageType: string,
  userId: string,
  phoneNumberId: string
) {
  try {
    console.log(`[Meta V2 Background] Processing ${messageType} for group ${groupId}, seq ${sequenceNumber}`);

    // Get access token for Meta API
    const { data: credentials } = await supabase
      .from('whatsapp_meta_credentials')
      .select('access_token')
      .eq('phone_number_id', phoneNumberId)
      .single();

    if (!credentials?.access_token) {
      console.error('[Meta V2 Background] No access token found');
      return;
    }

    let mediaId;
    let bucketName;
    let fileExtension;

    if (messageType === 'image') {
      mediaId = message.image.id;
      bucketName = 'chat-images';
      const mimeType = message.image.mime_type || 'image/jpeg';
      if (mimeType.includes('png')) fileExtension = 'png';
      else if (mimeType.includes('webp')) fileExtension = 'webp';
      else fileExtension = 'jpg';
    } else if (messageType === 'audio') {
      mediaId = message.audio.id;
      bucketName = 'chat-audios';
      const mimeType = message.audio.mime_type || 'audio/ogg';
      if (mimeType.includes('mpeg')) fileExtension = 'mp3';
      else if (mimeType.includes('mp4')) fileExtension = 'mp4';
      else fileExtension = 'ogg';
    } else {
      console.log('[Meta V2 Background] Unsupported media type for processing:', messageType);
      return;
    }

    // 1. Get media URL from Meta
    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      }
    );

    if (!mediaInfoResponse.ok) {
      console.error('[Meta V2 Background] Error fetching media info:', await mediaInfoResponse.text());
      return;
    }

    const mediaInfo = await mediaInfoResponse.json();
    const mediaUrl = mediaInfo.url;

    // 2. Download the file
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`
      }
    });

    if (!mediaResponse.ok) {
      console.error('[Meta V2 Background] Error downloading media:', await mediaResponse.text());
      return;
    }

    const mediaBlob = await mediaResponse.blob();
    const arrayBuffer = await mediaBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 3. Upload to Supabase Storage
    const fileName = `${userId}/${messageType}s/${Date.now()}_${mediaId}.${fileExtension}`;
    const mimeType = mediaInfo.mime_type || 'application/octet-stream';

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('[Meta V2 Background] Upload error:', uploadError);
      return;
    }

    // 4. Get public URL
    const { data: urlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log(`[Meta V2 Background] ${messageType} stored successfully:`, urlData.publicUrl);

    // 5. Update message queue with storage info
    await supabase
      .from('message_queue_v2')
      .update({
        media_processed: true,
        media_storage_path: fileName,
        media_public_url: urlData.publicUrl
      })
      .eq('group_id', groupId)
      .eq('sequence_number', sequenceNumber);

    console.log(`[Meta V2 Background] Updated queue entry with media URL`);

    // 6. Also update the message in messages table with the media URL
    const whatsappMessageId = message.id;
    const metadataField = messageType === 'image' ? 'imageUrl' : 'audioUrl';
    
    // Get current metadata and update it
    const { data: currentMessage } = await supabase
      .from('messages')
      .select('metadata')
      .eq('whatsapp_message_id', whatsappMessageId)
      .maybeSingle();

    if (currentMessage) {
      const updatedMetadata = {
        ...(currentMessage.metadata || {}),
        [metadataField]: urlData.publicUrl,
        storagePath: fileName
      };

      await supabase
        .from('messages')
        .update({ metadata: updatedMetadata })
        .eq('whatsapp_message_id', whatsappMessageId);

      console.log(`[Meta V2 Background] Updated message table with ${messageType} URL`);
    }

  } catch (error) {
    console.error('[Meta V2 Background] Error in processMediaInBackground:', error);
  }
}
