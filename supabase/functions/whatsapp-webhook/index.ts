
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener parámetro de usuario único de la URL
    const url = new URL(req.url);
    let userHash = url.searchParams.get('user');
    
    // Si el userHash contiene "/messages-upsert" u otro sufijo, removerlo
    if (userHash && userHash.includes('/')) {
      userHash = userHash.split('/')[0];
    }
    
    console.log('Parsed user hash:', userHash, 'Original param:', url.searchParams.get('user'));
    
    console.log('User hash from URL:', userHash, 'Full URL:', req.url);

    if (!userHash) {
      console.log('Missing user parameter in webhook URL');
      return new Response(JSON.stringify({ error: 'Missing user parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body once
    const body = await req.json();

    // Check if user has v2 enabled - redirect to v2 webhook if so
    // Resolve userHash to actual user_id (same logic used below)
    let targetUserId: string | null = null;
    try {
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      if (!usersError && users?.users?.length) {
        for (const userData of users.users) {
          const fullBase64 = btoa(userData.email || '');
          const shortHash = fullBase64.replace(/[+/=]/g, '').substring(0, 16);
          let decoded: string | null = null;
          try { decoded = atob(userHash!); } catch {}
          if (userHash === shortHash || userHash === fullBase64 || decoded === (userData.email || '')) {
            targetUserId = userData.id;
            break;
          }
        }
      }
    } catch (e) {
      console.error('[V1] Error resolving user from hash:', e);
    }

    if (targetUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('use_webhook_v2')
        .eq('user_id', targetUserId)
        .single();

      if (profile?.use_webhook_v2) {
        console.log('[V1] User has v2 enabled, redirecting to whatsapp-webhook-v2');
        // Call v2 webhook with the REAL user_id in the URL (v2 expects user_id)
        const v2Url = `${supabaseUrl}/functions/v1/whatsapp-webhook-v2?user=${targetUserId}`;
        const v2Response = await fetch(v2Url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(body)
        });

        const v2Data = await v2Response.json();

        if (!v2Response.ok) {
          console.error('[V1] Error calling v2 webhook:', v2Data);
          return new Response(JSON.stringify({ error: 'Error redirecting to v2', details: v2Data }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[V1] Successfully redirected to v2');
        return new Response(JSON.stringify(v2Data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('Received webhook data:', JSON.stringify(body, null, 2));

    // Check if this is an order creation request from AI agent FIRST
    if (body.customer_name && body.products && body.user_id && body.customer_id) {
      console.log('Creating order from AI agent data:', JSON.stringify(body, null, 2));
      return await handleOrderCreation(body, supabase);
    }

    // Check if this is a human intervention request from AI agent
    console.log('Checking for intervention request. mensaje_agente:', body.mensaje_agente, 'celular_destinario:', body.celular_destinario);
    if (body.mensaje_agente && body.celular_destinario) {
      console.log('AI agent requesting human intervention for:', body.celular_destinario, 'Message:', body.mensaje_agente);
      console.log('User hash for intervention:', userHash);
      
      try {
        // First, find the user by hash to get the correct user ID
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
          console.error('Error fetching users for intervention:', usersError);
          throw usersError;
        }

        let targetUser = null;
        for (const userData of users.users) {
          const fullBase64 = btoa(userData.email || '');
          const shortHash = fullBase64.replace(/[+/=]/g, '').substring(0, 16);
          let decoded = null;
          try { decoded = atob(userHash); } catch {}
          if (userHash === shortHash || userHash === fullBase64 || decoded === (userData.email || '')) {
            targetUser = userData;
            break;
          }
        }

        if (!targetUser) {
          console.log('No user found for hash during intervention:', userHash);
          throw new Error('User not found for intervention');
        }

        console.log('Updating customer with phone:', body.celular_destinario, 'for user:', targetUser.email);
        
        const { data: updateData, error: updateError } = await supabase
          .from('customers')
          .update({ ai_agent_enabled: false })
          .eq('phone', body.celular_destinario)
          .eq('user_id', targetUser.id) // Use the correct user ID based on hash
          .select()
          .select()

        console.log('Update result - data:', updateData, 'error:', updateError);

        if (updateError) {
          console.error('Error disabling AI agent:', updateError)
          return new Response(JSON.stringify({ error: 'Failed to disable AI agent', details: updateError }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          console.log('AI agent update successful. Updated records:', updateData?.length || 0)
          
          // Send notification to admin about customer needing assistance
          try {
            const notificationMessage = body.mensaje_agente || 'Cliente necesita asistencia humana';
            
            const notificationResponse = await supabase.functions.invoke('send-admin-notification', {
              body: {
                user_id: targetUser.id,
                message: notificationMessage,
                notification_type: 'customer_assistance',
                metadata: {
                  customer_name: updateData?.[0]?.name || 'Cliente',
                  customer_phone: body.celular_destinario
                }
              }
            });

            if (notificationResponse.error) {
              console.error('Error sending assistance notification:', notificationResponse.error);
            } else {
              console.log('Assistance notification sent successfully');
            }
          } catch (notificationError) {
            console.error('Error in assistance notification:', notificationError);
          }
          
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'AI agent disabled for customer', 
            phone: body.celular_destinario,
            updatedRecords: updateData?.length || 0,
            updatedData: updateData
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('Error processing human intervention request:', error)
        return new Response(JSON.stringify({ error: 'Failed to disable AI agent', details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check if this is an AI agent response
    if (body.respuesta_agente === true) {
      console.log('Processing AI agent response');
      return await handleAgentResponse(body, userHash, supabase);
    }

    // Check if this is an order creation request from AI agent
    if (body.customer_name && body.products && body.user_id && body.customer_id) {
      console.log('Processing order creation request from AI agent');
      return await handleOrderCreation(body, supabase);
    }

    // Extract WhatsApp message data from the correct structure
    const messageData = body.data;
    
    // Extract instance name from webhook body (Evolution API sends it)
    const instanceName = body.instance || body.instanceName || null;
    console.log('Instance name from webhook:', instanceName);
    
    if (!messageData || !messageData.key || !messageData.message) {
      console.log('Missing required fields in message data structure');
      console.log('Available data:', JSON.stringify(body, null, 2));
      return new Response(JSON.stringify({ error: 'Invalid message structure' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if message is from us - if so, set sender_type to business
    let senderType = 'customer';
    if (messageData.key.fromMe === true) {
      console.log('Processing message sent by business');
      senderType = 'business';
    }

    // Extract phone number from remoteJid (remove @s.whatsapp.net)
    const from = messageData.key.remoteJid.replace('@s.whatsapp.net', '');
    const pushName = messageData.pushName || from;
    
    // First, find the user by hash to get email for image processing
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    let targetUser = null;
    for (const userData of users.users) {
      const fullBase64 = btoa(userData.email || '');
      const shortHash = fullBase64.replace(/[+/=]/g, '').substring(0, 16);
      let decoded = null;
      try { decoded = atob(userHash); } catch {}
      if (userHash === shortHash || userHash === fullBase64 || decoded === (userData.email || '')) {
        targetUser = userData;
        break;
      }
    }

    if (!targetUser) {
      console.log('No user found for hash:', userHash);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No user found for this webhook' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract message content and handle images
    let messageContent = '';
    let messageType = 'text';
    let messageMetadata = null;
    
    // Check for quoted message
    let quotedMessageInfo = null;
    if (messageData.contextInfo?.quotedMessage) {
      const quotedMessage = messageData.contextInfo.quotedMessage;
      console.log('Processing quoted message:', JSON.stringify(quotedMessage, null, 2));
      
      if (quotedMessage.imageMessage) {
        quotedMessageInfo = {
          type: 'image',
          caption: quotedMessage.imageMessage.caption || null,
          url: quotedMessage.imageMessage.url || null
        };
      } else if (quotedMessage.conversation) {
        quotedMessageInfo = {
          type: 'text',
          content: quotedMessage.conversation
        };
      } else if (quotedMessage.extendedTextMessage) {
        quotedMessageInfo = {
          type: 'text',
          content: quotedMessage.extendedTextMessage.text
        };
      }
      
      if (quotedMessageInfo) {
        console.log('Quoted message info extracted:', quotedMessageInfo);
      }
    }
    
    if (messageData.message.conversation) {
      messageContent = messageData.message.conversation;
    } else if (messageData.message.extendedTextMessage?.text) {
      messageContent = messageData.message.extendedTextMessage.text;
    } else if (messageData.message.audioMessage) {
      messageContent = '[Audio Message]';
      messageType = 'audio';
      
      // Extract message ID and fetch base64 audio from Evolution API
      const messageId = messageData.key.id;
      console.log('Processing audio message with ID:', messageId, 'for user:', targetUser.email);
      
      try {
        const instanceParam = encodeURIComponent(instanceName || targetUser.email);
        
        // Fetch base64 audio from Evolution API
        const audioResponse = await fetch(`https://n8n-evolution-api.uefo06.easypanel.host/chat/getBase64FromMediaMessage/${instanceParam}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'YCIUD2246CIPMDX1RW5CHB158IC10UE3J8ZNMG'
          },
          body: JSON.stringify({
            message: {
              key: {
                id: messageId
              }
            },
            convertToMp4: false
          })
        });

        console.log('Audio API response status:', audioResponse.status);

        if (audioResponse.ok) {
          const audioData = await audioResponse.json();
          console.log('Raw audio data response structure:', Object.keys(audioData));
          
          // Handle different response formats
          let base64Data = null;
          let fileName = `${messageId}.ogg`;
          let mimeType = 'audio/ogg';
          let duration = null;
          let fileSize = null;
          
          if (Array.isArray(audioData) && audioData.length > 0) {
            // Array format response
            const firstAudio = audioData[0];
            base64Data = firstAudio.base64;
            fileName = firstAudio.fileName || fileName;
            mimeType = firstAudio.mimetype || mimeType;
            fileSize = firstAudio.size;
            console.log('Array format - base64 length:', base64Data?.length);
          } else if (audioData.base64) {
            // Direct object format
            base64Data = audioData.base64;
            fileName = audioData.fileName || fileName;
            mimeType = audioData.mimetype || mimeType;
            fileSize = audioData.size;
            console.log('Object format - base64 length:', base64Data?.length);
          }
          
          // Extract duration from original message
          if (messageData.message.audioMessage?.seconds) {
            duration = messageData.message.audioMessage.seconds;
          }
          
          if (base64Data) {
            console.log('Processing base64 audio data for storage upload...');
            
            // Convert base64 to binary
            const base64WithoutPrefix = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
            const binaryString = atob(base64WithoutPrefix);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Upload to Supabase Storage
            const storagePath = `chat-audios/${targetUser.id}/${Date.now()}-${fileName}`;
            console.log('Uploading audio to storage path:', storagePath);
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-uploads')
              .upload(storagePath, bytes, {
                contentType: mimeType,
                upsert: false
              });

            if (uploadError) {
              console.error('Error uploading audio to storage:', uploadError);
              messageContent = '[Error al procesar audio]';
            } else {
              console.log('Audio uploaded successfully:', storagePath);
              
              // Get public URL
              const { data: publicUrlData } = supabase.storage
                .from('chat-uploads')
                .getPublicUrl(storagePath);
              
              const audioUrl = publicUrlData.publicUrl;
              console.log('Public audio URL generated:', audioUrl);
              
              messageMetadata = {
                audioUrl: audioUrl,
                fileName: fileName,
                mimeType: mimeType,
                duration: duration,
                fileSize: fileSize,
                storagePath: storagePath
              };
              
              messageContent = `[Audio enviado: ${Math.round(duration || 0)}s]`;
              console.log('Audio metadata saved:', messageMetadata);
            }
          } else {
            console.log('No base64 data found in audio response');
            messageContent = '[Error: No se pudo obtener el audio]';
          }
        } else {
          const errorText = await audioResponse.text();
          console.error('Failed to fetch audio data:', audioResponse.status, errorText);
          messageContent = '[Error al procesar audio]';
        }
      } catch (error) {
        console.error('Error processing audio:', error);
        messageContent = '[Error al procesar audio]';
      }
    } else if (messageData.message.imageMessage) {
      messageContent = '[Image Message]';
      messageType = 'image';
      
      // Extract message ID and fetch base64 image
      const messageId = messageData.key.id;
      console.log('Processing image message with ID:', messageId, 'for user:', targetUser.email);
      
      try {
        const instanceParam = encodeURIComponent(instanceName || targetUser.email);
        
        // Fetch base64 image from Evolution API
        const imageResponse = await fetch('https://n8n-evolution-api.uefo06.easypanel.host/chat/getBase64FromMediaMessage/' + instanceParam, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'YCIUD2246CIPMDX1RW5CHB158IC10UE3J8ZNMG'
          },
          body: JSON.stringify({
            message: {
              key: {
                id: messageId
              }
            },
            convertToMp4: true
          })
        });

        console.log('Image API response status:', imageResponse.status);

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          console.log('Raw image data response:', JSON.stringify(imageData, null, 2));
          
          // Handle different response formats
          let base64Data = null;
          let fileName = `${messageId}.jpeg`;
          let mimeType = 'image/jpeg';
          let size = null;
          
          if (Array.isArray(imageData) && imageData.length > 0) {
            // Array format response
            const firstImage = imageData[0];
            base64Data = firstImage.base64;
            fileName = firstImage.fileName || fileName;
            mimeType = firstImage.mimetype || mimeType;
            size = firstImage.size;
            console.log('Array format - base64 length:', base64Data?.length);
          } else if (imageData.base64) {
            // Direct object format
            base64Data = imageData.base64;
            fileName = imageData.fileName || fileName;
            mimeType = imageData.mimetype || mimeType;
            size = imageData.size;
            console.log('Object format - base64 length:', base64Data?.length);
          }
          
          if (base64Data) {
            console.log('Processing base64 data for storage upload...');
            
            // Convert base64 to blob
            const base64WithoutPrefix = base64Data.replace(/^data:image\/[^;]+;base64,/, '');
            const binaryString = atob(base64WithoutPrefix);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Upload to Supabase Storage
            const storagePath = `chat-images/${targetUser.id}/${Date.now()}-${fileName}`;
            console.log('Uploading to storage path:', storagePath);
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-uploads')
              .upload(storagePath, bytes, {
                contentType: mimeType,
                upsert: false
              });

            if (uploadError) {
              console.error('Error uploading image to storage:', uploadError);
              messageContent = '[Error al procesar imagen]';
            } else {
              console.log('Image uploaded successfully:', storagePath);
              
              // Get public URL
              const { data: publicUrlData } = supabase.storage
                .from('chat-uploads')
                .getPublicUrl(storagePath);
              
              const imageUrl = publicUrlData.publicUrl;
              console.log('Public image URL generated:', imageUrl);
              
              messageMetadata = {
                imageUrl: imageUrl,
                fileName: fileName,
                mimeType: mimeType,
                size: size,
                storagePath: storagePath
              };
              
              messageContent = `[Imagen enviada: ${fileName}]`;
              console.log('Image metadata saved:', messageMetadata);
            }
          } else {
            console.log('No base64 data found in response');
            messageContent = '[Error: No se pudo obtener la imagen]';
          }
        } else {
          const errorText = await imageResponse.text();
          console.error('Failed to fetch image data:', imageResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    } else if (messageData.message.documentMessage) {
      messageContent = '[Document Message]';
      messageType = 'document';
    } else {
      messageContent = '[Unsupported Message Type]';
    }

    console.log('Processing message from:', from, 'Name:', pushName, 'Content:', messageContent, 'Type:', messageType);

    console.log('Found target user:', targetUser.email);

    // Find or create customer
    let customer;
    const { data: existingCustomer, error: customerFetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', from)
      .eq('user_id', targetUser.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data

    if (customerFetchError) {
      console.error('Error fetching customer:', customerFetchError);
      throw customerFetchError;
    }

    if (existingCustomer) {
      customer = existingCustomer;
      console.log('Found existing customer:', customer.id, customer.name);
      
      // Update last seen
      const { error: updateCustomerError } = await supabase
        .from('customers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', customer.id);

      if (updateCustomerError) {
        console.error('Error updating customer:', updateCustomerError);
        throw updateCustomerError;
      }
    } else {
      // Create new customer - check user preferences for new customers
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('new_customer_agent_enabled')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile for new customer settings:', profileError);
      }

      // Determine if AI agent should be enabled for new customers
      const aiAgentEnabled = userProfile?.new_customer_agent_enabled ?? true;
      
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: pushName, // Usar el pushName si está disponible, sino el número
          phone: from,
          user_id: targetUser.id,
          last_seen: new Date().toISOString(),
          ai_agent_enabled: aiAgentEnabled
        })
        .select()
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        throw customerError;
      }
      
      customer = newCustomer;
      console.log('Created new customer:', customer.id, 'with AI agent', aiAgentEnabled ? 'enabled' : 'disabled');
    }

    // Find or create chat
    let chat;
    const { data: existingChat, error: chatFetchError } = await supabase
      .from('chats')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('user_id', targetUser.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data

    if (chatFetchError) {
      console.error('Error fetching chat:', chatFetchError);
      throw chatFetchError;
    }

    if (existingChat) {
      chat = existingChat;
      console.log('Found existing chat:', chat.id);
      
      // Update last message time
      const { error: updateChatError } = await supabase
        .from('chats')
        .update({ 
          last_message_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', chat.id);

      if (updateChatError) {
        console.error('Error updating chat:', updateChatError);
        throw updateChatError;
      }
    } else {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          user_id: targetUser.id,
          customer_id: customer.id,
          last_message_at: new Date().toISOString(),
          status: 'active',
          instance_name: instanceName
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat:', chatError);
        throw chatError;
      }
      
      chat = newChat;
      console.log('Created new chat:', chat.id);
    }

    // Add quoted message info to metadata if exists
    if (quotedMessageInfo && messageMetadata) {
      messageMetadata.quotedMessage = quotedMessageInfo;
    } else if (quotedMessageInfo) {
      messageMetadata = { quotedMessage: quotedMessageInfo };
    }

    // Check if AI agent is enabled for this customer and only send customer messages to AI (Evolution API uses customer-level setting)
    if (customer.ai_agent_enabled && senderType === 'customer') {
      console.log('AI agent is enabled for chat:', chat.id, 'sending to webhook...');
      
      try {
        // Fetch both profile and store data
        const [profileResult, storeResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('ai_agent_role, ai_agent_objective, store_info, sales_mode, payment_accounts, payment_methods, agent_name, proactivity_level, customer_treatment, welcome_message, call_to_action, special_instructions, website, new_customer_agent_enabled, auto_reactivation_hours, message_buffer_seconds')
            .eq('user_id', targetUser.id)
            .single(),
          supabase
            .from('store_settings')
            .select('store_slug, is_active, shipping_rates')
            .eq('user_id', targetUser.id)
            .eq('is_active', true)
            .single()
        ]);

        const { data: profileData, error: profileError } = profileResult;
        const { data: storeData, error: storeError } = storeResult;
        
        // Get buffer configuration
        const bufferSeconds = profileData?.message_buffer_seconds ?? 3;
        
        // ONLY text messages use the buffer - images and audio go directly to agent
        const shouldBuffer = messageType === 'text' && bufferSeconds > 0;
        
        // Create the individual message first (for display in chat)
        console.log('Creating individual message in chat');
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            chat_id: chat.id,
            content: messageContent,
            sender_type: senderType,
            message_type: messageType,
            is_read: false,
            metadata: messageMetadata
          });

        if (messageError) {
          console.error('Error creating message:', messageError);
          throw messageError;
        }

        console.log('Message created successfully in chat!');
        
        // If it's a text message, use the buffer
        if (shouldBuffer) {
          console.log(`Buffering text message for ${bufferSeconds} seconds - message already shown in chat`);
          
          // Add message to buffer for grouped sending to agent (including metadata with quoted message)
          const { error: bufferError } = await supabase
            .from('message_buffer')
            .insert({
              user_id: targetUser.id,
              customer_id: customer.id,
              chat_id: chat.id,
              message_content: messageContent,
              message_timestamp: new Date().toISOString(),
              metadata: messageMetadata,
              processed: false
            });
          
          if (bufferError) {
            console.error('Error adding to buffer:', bufferError);
            // Continue with immediate AI processing if buffer fails
          } else {
            // Schedule processing after buffer time
            console.log('Message buffered, scheduling grouped processing...');
            
            setTimeout(async () => {
              try {
                console.log(`Processing buffered messages for customer ${customer.id} after ${bufferSeconds}s delay`);
                
                // Call the grouped message processor
                const { error: processError } = await supabase.functions.invoke('process-grouped-messages', {
                  body: {
                    customerId: customer.id,
                    userId: targetUser.id
                  }
                });
                
                if (processError) {
                  console.error('Error processing grouped messages:', processError);
                }
              } catch (err) {
                console.error('Background processing error:', err);
              }
            }, bufferSeconds * 1000);
            
            // Return success immediately - message already created in chat
            console.log('Message shown in chat and scheduled for grouped sending to agent');
            return new Response(JSON.stringify({ 
              success: true,
              message: 'Message displayed and buffered for agent',
              chatId: chat.id,
              userId: targetUser.id
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        
        // For images and audio, process immediately and send directly to AI agent (no buffer)
        console.log('Processing message immediately with AI - Type:', messageType, 'Buffer:', bufferSeconds);

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        }

        if (storeError) {
          console.log('No store found or error fetching store:', storeError);
        } else {
          console.log('Store data found:', storeData);
        }

        // Generate userHash same way as in WhatsApp page
        const userHashFull = btoa(targetUser.email).replace(/[^a-zA-Z0-9]/g, '');
        const userHash = userHashFull.substring(0, 16);

        // Prepare media data for AI agent - send URLs instead of base64
        let imageUrl = null;
        let audioUrl = null;
        
        if (messageType === 'image' && messageMetadata?.imageUrl) {
          imageUrl = messageMetadata.imageUrl;
          console.log('Image URL for AI agent:', imageUrl);
        }
        
        if (messageType === 'audio' && messageMetadata?.audioUrl) {
          audioUrl = messageMetadata.audioUrl;
          console.log('Audio URL for AI agent:', audioUrl);
        }

        console.log('Sending to AI agent with media - Image:', !!imageUrl, 'Audio:', !!audioUrl);

        // Prepare quoted message info for AI agent
        let quotedInfo = null;
        if (quotedMessageInfo) {
          if (quotedMessageInfo.type === 'image' && quotedMessageInfo.caption) {
            quotedInfo = `El cliente está respondiendo a una imagen con el caption: "${quotedMessageInfo.caption}"`;
          } else if (quotedMessageInfo.type === 'text') {
            quotedInfo = `El cliente está respondiendo al mensaje: "${quotedMessageInfo.content}"`;
          }
        }

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

        // Increment AI usage BEFORE sending to agent (charge per customer message/execution)
        try {
          const { data: usageData, error: usageError } = await supabase.rpc('increment_ai_message_usage', {
            target_user_id: targetUser.id,
            tokens_used: 1,
            cost_amount: 0.001,
            chat_id_param: chat.id,
            message_content_param: `Customer message: ${messageContent}`
          });
          
          if (usageError) {
            console.error('Error incrementing AI usage:', usageError);
          } else {
            console.log('AI usage incremented successfully for customer message', usageData);
            
            // Si se debe cobrar, invocar la función de cobro de forma asíncrona
            if (usageData && usageData.should_charge) {
              console.log(`Triggering charge for user ${targetUser.id}, pending: $${usageData.pending_amount}`);
              
              supabase.functions.invoke('charge-extra-messages', {
                body: {
                  user_id: targetUser.id,
                  charge_amount: usageData.charge_amount
                }
              }).then(({ data: chargeData, error: chargeError }) => {
                if (chargeError) {
                  console.error('Error charging extra messages:', chargeError);
                } else {
                  console.log('Extra messages charge initiated:', chargeData);
                }
              }).catch(err => console.error('Charge invocation failed:', err));
            }
          }
        } catch (usageError) {
          console.error('Failed to increment AI usage:', usageError);
        }

        const { error: aiWebhookError } = await supabase.functions.invoke('send-ai-agent-webhook', {
          body: {
            userEmail: targetUser.email,
            userId: targetUser.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerUid: customer.id,
            messageContent: messageContent,
            messageType: messageType,
            storeInfo: profileData?.store_info || '',
            salesMode: profileData?.sales_mode || 'advise_only',
            paymentAccounts: profileData?.payment_accounts || [],
            paymentMethods: profileData?.payment_methods || 'both',
            
            // New personalization fields
            agentName: profileData?.agent_name || 'Asistente Virtual',
            proactivityLevel: profileData?.proactivity_level || 'reactive',
            customerTreatment: profileData?.customer_treatment || 'tu',
            welcomeMessage: profileData?.welcome_message || 'Hola! Soy tu asistente virtual, ¿en qué puedo ayudarte hoy?',
            callToAction: profileData?.call_to_action || '¿Te gustaría que procese tu pedido?',
            specialInstructions: profileData?.special_instructions || '',
            website: profileData?.website || '',
            shippingRates: shippingRates,
            
            storeUrl: storeData?.store_slug ? `https://fczgowziugcvrpgfelks.lovable.app/tienda/${storeData.store_slug}` : null,
            userHash: userHash,
            imagen: imageUrl,
            audio: audioUrl,
            quotedMessage: quotedInfo
          }
        });

        if (aiWebhookError) {
          console.error('Error sending AI agent webhook:', aiWebhookError);
        } else {
          console.log('AI agent webhook sent successfully');
        }
      } catch (error) {
        console.error('Error invoking AI agent webhook:', error);
      }
    } else {
      // AI agent is not enabled or message is not from customer - create message normally
      console.log('Creating message without AI processing - AI enabled:', chat.ai_agent_enabled, 'Sender:', senderType);
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          content: messageContent,
          sender_type: senderType,
          message_type: messageType,
          is_read: senderType === 'business' ? true : false,
          metadata: messageMetadata
        });

      if (messageError) {
        console.error('Error creating message:', messageError);
        throw messageError;
      }

      console.log('Message created successfully without AI processing!');
    }

    // If this message was sent by the business (human), optionally disable the AI agent
    if (senderType === 'business') {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('disable_agent_on_manual_reply')
          .eq('user_id', targetUser.id)
          .single();

        console.log('🔍 Webhook manual-reply setting:', profileData?.disable_agent_on_manual_reply);

        if (profileData?.disable_agent_on_manual_reply !== false) {
          console.log('✅ Webhook: disabling AI agent for customer:', customer.id);
          const { error: disableError } = await supabase
            .from('customers')
            .update({ ai_agent_enabled: false, updated_at: new Date().toISOString() })
            .eq('id', customer.id)
            .eq('user_id', targetUser.id);

          if (disableError) {
            console.error('❌ Webhook: error disabling AI agent:', disableError);
          } else {
            console.log('✅ Webhook: AI agent disabled for customer:', customer.id);
          }
        } else {
          console.log('⏭️ Webhook: skipping deactivation (disabled in config)');
        }
      } catch (e) {
        console.error('Webhook: unexpected error while disabling agent:', e);
      }
    }

    console.log('Message processed successfully for user:', targetUser.email);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Message processed successfully',
      chatId: chat.id,
      userId: targetUser.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Handle order creation from AI agent
async function handleOrderCreation(orderData: any, supabase: any) {
  console.log('Creating order from AI agent data:', JSON.stringify(orderData, null, 2));
  
  try {
    const {
      customer_name,
      customer_last_name,
      customer_address,
      products,
      Departamento,
      ciudad,
      forma_de_pago,
      user_id,
      customer_id,
      shipping_tariff_id
    } = orderData;

    console.log('Creating order with data:', {
      user_id,
      customer_id,
      products: products?.length || 0,
      shipping_tariff_id,
      forma_de_pago
    });

    // Calculate total from products
    let total = 0;
    if (Array.isArray(products)) {
      total = products.reduce((sum: number, product: any) => {
        return sum + (product.precio * product.cantidad);
      }, 0);
    }

    // Get store data for shipping calculation
    const { data: storeData, error: storeError } = await supabase
      .from('store_settings')
      .select('shipping_rates')
      .eq('user_id', user_id)
      .single();

    if (storeError) {
      console.error('Error fetching store data:', storeError);
    }
    
    console.log('Store data retrieved:', {
      hasStoreData: !!storeData,
      hasShippingRates: !!storeData?.shipping_rates,
      shippingRatesType: typeof storeData?.shipping_rates,
      shippingRatesContent: storeData?.shipping_rates
    });

    // Update customer with address information if provided
    if (customer_address || customer_last_name || Departamento || ciudad) {
      const updateData: any = {};
      if (customer_last_name) updateData.last_name = customer_last_name;
      if (customer_address) updateData.address = customer_address;
      if (ciudad) updateData.city = ciudad;
      if (Departamento) updateData.province = Departamento;

      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer_id)
        .eq('user_id', user_id);

      if (customerUpdateError) {
        console.error('Error updating customer:', customerUpdateError);
      } else {
        console.log('Customer updated with address info');
      }
    }

    // Calculate shipping cost from selected tariff
    if (!shipping_tariff_id) {
      console.log('Missing required field: shipping_tariff_id');
      return new Response(JSON.stringify({ 
        error: 'Missing required field: shipping_tariff_id' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let shippingCost = 0;
    let selectedShippingRate = null;
    
    console.log('Shipping calculation debug:', {
      shipping_tariff_id,
      has_store_data: !!storeData,
      has_shipping_rates: !!storeData?.shipping_rates,
      shipping_rates_type: typeof storeData?.shipping_rates,
      shipping_rates: storeData?.shipping_rates
    });
    
    if (shipping_tariff_id && storeData?.shipping_rates) {
      const rates = Array.isArray(storeData.shipping_rates) ? 
        storeData.shipping_rates : 
        JSON.parse(storeData.shipping_rates || '[]');
      
      console.log('Available rates:', rates);
      console.log('Looking for tariff:', shipping_tariff_id, 'type:', typeof shipping_tariff_id);
      
      const norm = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : String(v ?? '').trim().toLowerCase());
      const candidateId = typeof shipping_tariff_id === 'object' && shipping_tariff_id !== null 
        ? (shipping_tariff_id.id ?? shipping_tariff_id.name) 
        : shipping_tariff_id;
      const candidateName = typeof shipping_tariff_id === 'object' && shipping_tariff_id !== null 
        ? (shipping_tariff_id.name ?? shipping_tariff_id.id) 
        : shipping_tariff_id;

      selectedShippingRate = rates.find((rate: any) => {
        const rateId = String(rate.id ?? '').trim();
        const rateName = String(rate.name ?? '').trim();
        return rateId === String(candidateId ?? '').trim() 
          || norm(rateName) === norm(candidateName);
      });
      
      console.log('Selected shipping rate:', selectedShippingRate);
      
      if (!selectedShippingRate) {
        console.log('No matching shipping rate found for:', shipping_tariff_id);
        return new Response(JSON.stringify({ 
          error: 'Invalid shipping_tariff_id. No matching shipping rate found in store settings.',
          provided: shipping_tariff_id,
          available_rates: rates.map((r: any) => ({ id: r.id, name: r.name }))
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      shippingCost = Number(selectedShippingRate.price) || 0;
      console.log('Applied shipping cost:', shippingCost);
    }

    const subtotal = total;
    const totalWithShipping = subtotal + shippingCost;

    // Create the order
    const { data: newOrderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user_id,
        customer_id: customer_id,
        total: totalWithShipping,
        shipping_cost: shippingCost,
        shipping_tariff_id: selectedShippingRate?.id || shipping_tariff_id,
        status: 'pendiente',
        order_source: 'agent',
        payment_method: (() => {
          const method = typeof forma_de_pago === 'string' ? forma_de_pago : '';
          const m = method.toLowerCase().trim();
          if (m.includes('contra entrega') || m.includes('contraentrega')) return 'Pago Contra Entrega';
          if (m.includes('anticipado') || m.includes('adelanto')) return 'Anticipado';
          if (m.includes('transferencia')) return 'Transferencia';
          if (m.includes('efectivo')) return 'Efectivo';
          if (m.includes('tarjeta')) return 'Tarjeta';
          return 'Pago Contra Entrega';
        })(),
        notes: `Pedido generado automáticamente por AI Agent. ${customer_address ? `Dirección: ${customer_address}` : ''} ${Departamento ? `Departamento: ${Departamento}` : ''} ${ciudad ? `Ciudad: ${ciudad}` : ''} ${selectedShippingRate ? `Envío: ${selectedShippingRate.name} - $${shippingCost}` : ''}`
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', {
        error: orderError,
        user_id,
        customer_id,
        total: totalWithShipping,
        shipping_cost: shippingCost,
        shipping_tariff_id: selectedShippingRate?.id || shipping_tariff_id
      });
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('Order created successfully:', newOrderData.id);

    // Create order items
    if (Array.isArray(products)) {
      let createdCount = 0;
      for (const product of products) {
        // Accept multiple shapes and sources (local/Shopify)
        const candidateId = product.product_id ?? product.id ?? product.variant_id ?? product.sku ?? product.handle;
        const candidateName = product.nombre ?? product.name ?? null;
        let actualProductId: string | null = null;

        // 1) Try as variant UUID id
        if (candidateId) {
          const { data: varById } = await supabase
            .from('product_variants')
            .select('product_id')
            .eq('id', String(candidateId))
            .maybeSingle();
          if (varById?.product_id) {
            actualProductId = varById.product_id as string;
          }
        }

        // 2) Try variant by Shopify ID
        if (!actualProductId && candidateId) {
          const { data: varByShop } = await supabase
            .from('product_variants')
            .select('product_id')
            .eq('shopify_id', String(candidateId))
            .maybeSingle();
          if (varByShop?.product_id) {
            actualProductId = varByShop.product_id as string;
          }
        }

        // 3) Try product by UUID id
        if (!actualProductId && candidateId) {
          const { data: prodById } = await supabase
            .from('products')
            .select('id')
            .eq('id', String(candidateId))
            .maybeSingle();
          if (prodById?.id) {
            actualProductId = prodById.id as string;
          }
        }

        // 4) Try product by Shopify ID
        if (!actualProductId && candidateId) {
          const { data: prodByShop } = await supabase
            .from('products')
            .select('id')
            .eq('shopify_id', String(candidateId))
            .maybeSingle();
          if (prodByShop?.id) {
            actualProductId = prodByShop.id as string;
          }
        }

        // 5) Fallback by name for this user
        if (!actualProductId && candidateName) {
          const { data: prodByName } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', user_id)
            .ilike('name', candidateName)
            .maybeSingle();
          if (prodByName?.id) {
            actualProductId = prodByName.id as string;
          }
        }

        // Create placeholder product if we still don't have one
        if (!actualProductId) {
          console.error('Could not resolve product for order item. Creating placeholder product. Incoming:', { candidateId, candidateName, product });
          const qtyTmp = Number(product.cantidad ?? product.quantity ?? 1);
          const unitPrice = Number(product.precio ?? product.price ?? 0);
          const tempName = (candidateName || 'Producto personalizado').toString().slice(0, 120);
          const { data: tempProd, error: tempErr } = await supabase
            .from('products')
            .insert({
              user_id: user_id,
              name: tempName,
              description: 'Creado automáticamente desde pedido del agente (placeholder)'.slice(0, 255),
              price: isFinite(unitPrice) ? unitPrice : 0,
              stock: 0,
              is_active: false,
            })
            .select('id')
            .maybeSingle();
          if (tempErr || !tempProd?.id) {
            console.error('Failed to create placeholder product:', tempErr);
            continue;
          }
          actualProductId = tempProd.id as string;
        }

        const quantity = Number(product.cantidad ?? product.quantity ?? 1);
        const price = Number(product.precio ?? product.price ?? 0);

        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: newOrderData.id,
            product_id: actualProductId,
            quantity,
            price,
          });

        if (itemError) {
          console.error('Error creating order item:', {
            error: itemError,
            order_id: newOrderData.id,
            product_id: actualProductId,
            quantity,
            price,
          });
          continue;
        }
        createdCount += 1;
      }
      console.log('Created order items count:', createdCount);
    }

    // Try to create order in Shopify if integration exists
    try {
      console.log('🛍️ Attempting to create order in Shopify...');
      console.log('Order ID:', newOrderData.id);
      console.log('User ID:', user_id);
      
      const shopifyFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-shopify-order`;
      console.log('Calling Shopify function at:', shopifyFunctionUrl);
      
      const shopifyResponse = await fetch(shopifyFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          order_id: newOrderData.id,
          user_id: user_id
        })
      });

      const shopifyResponseText = await shopifyResponse.text();
      console.log('Shopify function response status:', shopifyResponse.status);
      console.log('Shopify function response:', shopifyResponseText);

      if (!shopifyResponse.ok) {
        console.error('❌ Error creating Shopify order. Status:', shopifyResponse.status);
        console.error('Response:', shopifyResponseText);
      } else {
        console.log('✅ Shopify order created successfully');
        try {
          const shopifyData = JSON.parse(shopifyResponseText);
          console.log('Shopify order data:', shopifyData);
        } catch (e) {
          console.log('Could not parse Shopify response as JSON');
        }
      }
    } catch (shopifyError) {
      console.error('💥 Exception creating Shopify order:', shopifyError);
      console.error('Error message:', shopifyError.message);
      // Don't fail the order creation if Shopify sync fails
    }

    // Send confirmation message to customer via AI agent webhook
    try {
      const confirmationMessage = `✅ ¡Perfecto! Tu pedido ha sido registrado exitosamente.

📋 **Resumen del pedido:**
${products.map((p: any) => `• ${p.nombre} (Talla: ${p.talla}) - Cantidad: ${p.cantidad} - $${p.precio.toLocaleString()}`).join('\n')}

💰 **Subtotal:** $${subtotal.toLocaleString()}
${shippingCost > 0 ? `🚚 **Envío:** $${shippingCost.toLocaleString()} (${selectedShippingRate?.name || shipping_tariff})` : ''}
💰 **Total final:** $${totalWithShipping.toLocaleString()}
💳 **Forma de pago:** ${forma_de_pago}
🏠 **Dirección:** ${customer_address}

📦 Tu pedido será procesado y te contactaremos pronto para coordinar la entrega.

¡Gracias por tu compra! 🛍️`;

      // Find customer phone for webhook
      const { data: customerData } = await supabase
        .from('customers')
        .select('phone')
        .eq('id', customer_id)
        .single();

      if (customerData?.phone) {
        // Send message via AI agent
        console.log('Sending confirmation message to customer:', customerData.phone);
        
        // Find the user's profile to get webhook URL
        const { data: profileData } = await supabase
          .from('profiles')
          .select('webhook_url')
          .eq('user_id', user_id)
          .single();

        if (profileData?.webhook_url) {
          await fetch(profileData.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              celular_destinario: customerData.phone,
              mensaje: confirmationMessage,
              respuesta_agente: true
            })
          });
          console.log('Confirmation message sent successfully');
        }
      }
    } catch (error) {
      console.error('Error sending confirmation message:', error);
      // Don't fail the order creation if message sending fails
    }

    // Assign "Pedido Nuevo" tag to customer
    try {
      console.log('🏷️ Starting tag assignment process...');
      console.log('Customer ID:', customer_id);
      console.log('User ID:', user_id);
      console.log('Supabase URL:', Deno.env.get('SUPABASE_URL'));
      
      const tagRequestBody = {
        customer_id: customer_id,
        user_id: user_id
      };
      
      console.log('Tag request body:', JSON.stringify(tagRequestBody));
      
      const tagResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/assign-order-tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify(tagRequestBody)
      });

      console.log('Tag response status:', tagResponse.status);
      const tagResponseText = await tagResponse.text();
      console.log('Tag response body:', tagResponseText);

      if (tagResponse.ok) {
        console.log('✅ Tag "Pedido Nuevo" assigned successfully');
        try {
          const tagData = JSON.parse(tagResponseText);
          console.log('Tag assignment result:', tagData);
        } catch (parseError) {
          console.log('Could not parse tag response as JSON');
        }
      } else {
        console.error('❌ Error assigning tag. Status:', tagResponse.status);
        console.error('Error response:', tagResponseText);
      }
    } catch (tagError) {
      console.error('💥 Exception in tag assignment:', tagError);
      console.error('Tag error stack:', tagError.stack);
      // Don't fail the order creation if tag assignment fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Order created successfully',
      order_id: newOrderData.id,
      total: total
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create order', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleAgentResponse(body: any, userHash: string, supabase: any) {
  console.log('Processing agent response:', body);
  
  const phoneNumber = body.celular_destinario;
  const message = body.mensaje;
  const imageUrl = body.url_imagen;
  const caption = body.caption;
  
  if (!phoneNumber || (!message && !imageUrl)) {
    console.log('Missing phone number or message/image in agent response');
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Find user by hash
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    let targetUser = null;
    for (const userData of users.users) {
      const fullBase64 = btoa(userData.email || '');
      const shortHash = fullBase64.replace(/[+/=]/g, '').substring(0, 16);
      let decoded = null;
      try { decoded = atob(userHash); } catch {}
      if (userHash === shortHash || userHash === fullBase64 || decoded === (userData.email || '')) {
        targetUser = userData;
        break;
      }
    }

    if (!targetUser) {
      console.log('No user found for hash:', userHash);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No user found for this webhook' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find customer by phone
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phoneNumber)
      .eq('user_id', targetUser.id)
      .single();

    if (customerError) {
      console.error('Error finding customer:', customerError);
      throw customerError;
    }

    // Find chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('user_id', targetUser.id)
      .single();

    if (chatError) {
      console.error('Error finding chat:', chatError);
      throw chatError;
    }

    // Check if user has Meta WhatsApp credentials
    const { data: metaCreds } = await supabase
      .from('whatsapp_meta_credentials')
      .select('phone_number_id')
      .eq('user_id', targetUser.id)
      .maybeSingle();

    const usesMeta = !!metaCreds?.phone_number_id;
    console.log('User uses Meta WhatsApp:', usesMeta);

    // Send message or image to WhatsApp
    if (imageUrl) {
      // Send image with caption
      console.log('Sending image to WhatsApp:', phoneNumber, imageUrl, 'Caption:', caption);
      
      if (usesMeta) {
        // Use Meta API
        const { data: metaSendRes, error: sendError } = await supabase.functions.invoke('send-whatsapp-meta-message', {
          body: {
            userId: targetUser.id,
            to: phoneNumber,
            type: 'image',
            mediaUrl: imageUrl,
            caption: caption || message
          }
        });

        console.log('Meta image send result:', { error: sendError, data: metaSendRes });

        if (sendError) {
          console.error('Error sending Meta WhatsApp image:', sendError);
          throw sendError;
        }
      } else {
        // Use Evolution API
        const { error: sendError } = await supabase.functions.invoke('send-whatsapp-media', {
          body: {
            number: phoneNumber,
            mediatype: 'image',
            fileName: 'product-image.jpg',
            media: imageUrl,
            caption: caption,
            userEmail: targetUser.email
          }
        });

        if (sendError) {
          console.error('Error sending WhatsApp image:', sendError);
          throw sendError;
        }
      }

      // Save image message to database
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          content: caption || '[Imagen enviada]',
          sender_type: 'agent',
          message_type: 'image',
          is_read: true,
          metadata: { imageUrl: imageUrl }
        });

      if (messageError) {
        console.error('Error saving agent image message:', messageError);
        throw messageError;
      }
    } else {
      // Send text message
      console.log('Sending text message to WhatsApp:', phoneNumber, message);
      
      if (usesMeta) {
        // Use Meta API
        const { data: metaSendRes, error: sendError } = await supabase.functions.invoke('send-whatsapp-meta-message', {
          body: {
            userId: targetUser.id,
            to: phoneNumber,
            type: 'text',
            message: message
          }
        });

        console.log('Meta text send result:', { error: sendError, data: metaSendRes });

        if (sendError) {
          console.error('Error sending Meta WhatsApp message:', sendError);
          throw sendError;
        }
      } else {
        // Use Evolution API
        const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            number: phoneNumber,
            text: message,
            userEmail: targetUser.email
          }
        });

        if (sendError) {
          console.error('Error sending WhatsApp message:', sendError);
          throw sendError;
        }
      }

      // Save text message to database
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          content: message,
          sender_type: 'agent',
          message_type: 'text',
          is_read: true
        });

      if (messageError) {
        console.error('Error saving agent message:', messageError);
        throw messageError;
      }
    }

    // NOTE: AI usage is now charged when customer sends message (per execution)
    // No longer charging per agent response to avoid charging multiple times per execution

    // Update chat last message time
    const { error: updateChatError } = await supabase
      .from('chats')
      .update({ 
        last_message_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', chat.id);

    if (updateChatError) {
      console.error('Error updating chat:', updateChatError);
      throw updateChatError;
    }

    console.log('Agent response processed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Agent response processed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing agent response:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
