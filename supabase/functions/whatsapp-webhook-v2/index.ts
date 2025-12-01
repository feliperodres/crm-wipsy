import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse user identifier from URL (supports UUID or base64-encoded email/UUID)
    const url = new URL(req.url);
    const userParam = url.searchParams.get('user');
    
    if (!userParam) {
      console.error('[V2] No user identifier provided');
      return new Response(JSON.stringify({ error: 'user param required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isUuid = (s: string) => /^[0-9a-fA-F-]{36}$/.test(s);
    const tryB64 = (s: string) => {
      try { return atob(s); } catch { return null; }
    };

    let targetUserId: string | null = null;
    let profile: any | null = null;

    // 1) If it's already a UUID
    if (isUuid(userParam)) {
      targetUserId = userParam;
    } else {
      // 2) Try base64 decode once (common case is base64(email))
      const decoded = tryB64(userParam);
      if (decoded) {
        if (isUuid(decoded)) {
          targetUserId = decoded;
        } else if (decoded.includes('@')) {
          // Lookup by email in profiles to resolve user_id
          const { data: profByEmail } = await supabase
            .from('profiles')
            .select('user_id, use_webhook_v2, webhook_v2_url, message_buffer_v2_seconds')
            .eq('email', decoded)
            .maybeSingle();
          if (profByEmail) {
            profile = profByEmail;
            targetUserId = profByEmail.user_id;
          }
        }
      }
    }

    if (!targetUserId && !profile) {
      console.error('[V2] Could not resolve user from param:', userParam);
      return new Response(JSON.stringify({ error: 'invalid user param' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Load profile if not already loaded
    if (!profile) {
      const { data: prof, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, use_webhook_v2, webhook_v2_url, message_buffer_v2_seconds')
        .eq('user_id', targetUserId as string)
        .single();
      if (profileError || !prof) {
        console.error('[V2] Profile not found:', profileError);
        return new Response(JSON.stringify({ error: 'User not found' }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      profile = prof;
    }


    // Check if v2 is enabled for this user
    if (!profile.use_webhook_v2) {
      console.log('[V2] V2 not enabled for this user, should use v1');
      return new Response(JSON.stringify({ error: 'V2 not enabled' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = await req.json();
    console.log('[V2] Received webhook payload');

    // CHECK if this is an order creation request
    if (payload.customer_name && payload.products && payload.user_id && payload.customer_id) {
      console.log('[V2] Creating order from request data');
      return await handleOrderCreation(payload, supabase, profile.user_id);
    }

    // CHECK if this is an agent response from N8N (respuesta_agente: true)
    if (payload.respuesta_agente === true) {
      console.log('[V2] Processing agent response from N8N');
      const phoneNumber = payload.celular_destinario;
      const message = payload.mensaje;
      const imageUrl = payload.url_imagen;
      const caption = payload.caption;

      if (!phoneNumber || (!message && !imageUrl)) {
        console.error('[V2] Missing required fields in agent response');
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phoneNumber)
        .eq('user_id', profile.user_id)
        .single();

      if (customerError || !customer) {
        console.error('[V2] Customer not found:', customerError);
        return new Response(JSON.stringify({ error: 'Customer not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find chat using provided chat_id if present; fallback to latest chat for customer
      const providedChatId = payload.chat_id || payload.chatId || null;
      let chat: any = null;
      let chatError: any = null;

      if (providedChatId) {
        const { data: chatById, error: chatByIdError } = await supabase
          .from('chats')
          .select('id, created_at, instance_name')
          .eq('id', providedChatId)
          .eq('user_id', profile.user_id)
          .maybeSingle();
        chat = chatById;
        chatError = chatByIdError;
        console.log('[V2] Using provided chat_id to resolve chat:', providedChatId, 'found:', !!chat);
      }

      if (!chat) {
        const { data: latestChat, error: latestChatError } = await supabase
          .from('chats')
          .select('id, created_at, instance_name')
          .eq('customer_id', customer.id)
          .eq('user_id', profile.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        chat = latestChat;
        chatError = latestChatError;
        console.log('[V2] Fallback to latest chat for customer. chat_id:', chat?.id);
      }

      if (chatError || !chat) {
        console.error('[V2] Chat not found:', chatError);
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract phone_number_id from instance_name (format: meta_<phone_number_id>)
      let metaCreds = null;
      let usesMeta = false;
      
      if (chat.instance_name && chat.instance_name.startsWith('meta_')) {
        const phoneNumberId = chat.instance_name.replace('meta_', '');
        console.log('[V2] Extracted phoneNumberId from chat:', phoneNumberId);
        
        // Get Meta credentials for this specific phone_number_id
        const { data: specificCreds, error: metaErr } = await supabase
          .from('whatsapp_meta_credentials')
          .select('phone_number_id, access_token')
          .eq('user_id', profile.user_id)
          .eq('phone_number_id', phoneNumberId)
          .maybeSingle();
        
        if (metaErr) {
          console.error('[V2] Error fetching Meta credentials:', metaErr);
        } else if (specificCreds) {
          metaCreds = specificCreds;
          usesMeta = true;
          console.log('[V2] Using specific Meta credentials for phoneNumberId:', phoneNumberId);
        }
      }
      
      // Fallback: use most recent Meta credentials if no instance_name match
      if (!usesMeta) {
        const { data: metaRows, error: metaErr } = await supabase
          .from('whatsapp_meta_credentials')
          .select('phone_number_id, access_token, created_at')
          .eq('user_id', profile.user_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (metaErr) console.error('[V2] Meta creds query error:', metaErr);
        metaCreds = metaRows?.[0] || null;
        usesMeta = !!metaCreds;
      }
      
      console.log('[V2] Agent response - User uses Meta:', usesMeta, 'phoneNumberId:', metaCreds?.phone_number_id);

      // Send message or image to WhatsApp
      if (imageUrl) {
        console.log('[V2] Sending image to WhatsApp:', phoneNumber, imageUrl, 'Caption:', caption);

        let messageId = null;

        if (usesMeta) {
          const { data: metaSendRes, error: sendError } = await supabase.functions.invoke('send-whatsapp-meta-message', {
            body: {
              phoneNumberId: metaCreds.phone_number_id,
              to: phoneNumber,
              type: 'image',
              mediaUrl: imageUrl,
              caption: caption || message,
              chatId: chat.id
            }
          });

          console.log('[V2] Meta image send result:', { error: sendError, data: metaSendRes });

          if (sendError) {
            console.error('[V2] Error sending Meta WhatsApp image:', sendError);
            return new Response(JSON.stringify({ error: 'Failed to send image' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          messageId = metaSendRes?.messageId || null;
          console.log('[V2] WhatsApp message ID captured:', messageId);
        } else {
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          const userEmail = authUser?.user?.email || '';
          
          const { error: sendError } = await supabase.functions.invoke('send-whatsapp-media', {
            body: {
              number: phoneNumber,
              mediatype: 'image',
              fileName: 'product-image.jpg',
              media: imageUrl,
              caption: caption,
              userEmail
            }
          });

          if (sendError) {
            console.error('[V2] Error sending WhatsApp image:', sendError);
            return new Response(JSON.stringify({ error: 'Failed to send image' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // No need to save message here - send-whatsapp-meta-message does it now

      } else {
        // Send text message
        console.log('[V2] Sending text message to WhatsApp:', phoneNumber, message);

        let messageId = null;

        if (usesMeta) {
          const { data: metaSendRes, error: sendError } = await supabase.functions.invoke('send-whatsapp-meta-message', {
            body: {
              phoneNumberId: metaCreds.phone_number_id,
              to: phoneNumber,
              type: 'text',
              message: message,
              chatId: chat.id
            }
          });

          console.log('[V2] Meta text send result:', { error: sendError, data: metaSendRes });

          if (sendError) {
            console.error('[V2] Error sending Meta WhatsApp message:', sendError);
            return new Response(JSON.stringify({ error: 'Failed to send message' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Capturar el messageId para guardarlo
          messageId = metaSendRes?.messageId || null;
          console.log('[V2] WhatsApp message ID captured:', messageId);
        } else {
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          const userEmail = authUser?.user?.email || '';

          const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              number: phoneNumber,
              text: message,
              userEmail
            }
          });

          if (sendError) {
            console.error('[V2] Error sending WhatsApp message:', sendError);
            return new Response(JSON.stringify({ error: 'Failed to send message' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // No need to save message here - send-whatsapp-meta-message does it now
      }

      console.log('[V2] Agent response sent successfully');
      return new Response(JSON.stringify({ success: true, message: 'Agent response sent' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract instance/connection identifier
    const instanceName = payload.instance || payload.instanceName || payload.data?.instance || payload.instanceId || null;

    // Extract message data
    const messageData = payload.data;
    if (!messageData) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const key = messageData.key;
    const message = messageData.message;
    const pushName = messageData.pushName || 'Unknown';
    const senderPhone = key.remoteJid.replace('@s.whatsapp.net', '');
    const isFromMe = key.fromMe;

    // Determine sender type
    const senderType = isFromMe ? 'business' : 'customer';

    // Only process customer messages in v2
    if (senderType !== 'customer') {
      console.log('[V2] Skipping business message');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('id, ai_agent_enabled')
      .eq('user_id', profile.user_id)
      .eq('phone', senderPhone)
      .single();

    if (!customer) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          user_id: profile.user_id,
          phone: senderPhone,
          name: pushName,
          whatsapp_id: senderPhone,
          ai_agent_enabled: true
        })
        .select('id, ai_agent_enabled')
        .single();

      if (createError) {
        console.error('[V2] Error creating customer:', createError);
        throw createError;
      }
      customer = newCustomer;
    }

    // Find or create chat (respect instance for Meta)
    let desiredInstance: string | null = usesMeta && metaCreds?.phone_number_id ? `meta_${metaCreds.phone_number_id}` : null;

    let { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('user_id', profile.user_id)
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (desiredInstance) {
      // If using Meta, try to resolve the instance-specific chat first
      const { data: metaChat } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('customer_id', customer.id)
        .eq('instance_name', desiredInstance)
        .maybeSingle();
      if (metaChat) chat = metaChat;
    }

    if (!chat) {
      const insertPayload: any = {
        user_id: profile.user_id,
        customer_id: customer.id,
        whatsapp_chat_id: key.remoteJid,
      };
      if (desiredInstance) {
        insertPayload.instance_name = desiredInstance;
        insertPayload.status = 'active';
        insertPayload.last_message_at = new Date().toISOString();
      }

      const { data: newChat, error: createChatError } = await supabase
        .from('chats')
        .insert(insertPayload)
        .select('id')
        .single();

      if (createChatError) {
        console.error('[V2] Error creating chat:', createChatError);
        throw createChatError;
      }
      chat = newChat;
    }

    // Extract message content and type
    let messageContent = '';
    let messageType = 'text';
    let mediaUrl = null;
    let quotedMessageId = null;
    let quotedMetadata = null;

    // Handle quoted messages
    if (message.extendedTextMessage?.contextInfo?.quotedMessage) {
      quotedMessageId = message.extendedTextMessage.contextInfo.stanzaId;
      quotedMetadata = {
        quotedMessage: message.extendedTextMessage.contextInfo.quotedMessage
      };
    }

    // Determine message type and content
    if (message.conversation) {
      messageContent = message.conversation;
      messageType = 'text';
    } else if (message.extendedTextMessage) {
      messageContent = message.extendedTextMessage.text;
      messageType = 'text';
    } else if (message.imageMessage) {
      messageContent = message.imageMessage.caption || '[Imagen]';
      messageType = 'image';
      // Store the message data to extract URL later
      mediaUrl = 'pending';
    } else if (message.audioMessage) {
      messageContent = '[Audio]';
      messageType = 'audio';
      mediaUrl = 'pending';
    } else if (message.videoMessage) {
      messageContent = message.videoMessage.caption || '[Video]';
      messageType = 'video';
      mediaUrl = 'pending';
    } else if (message.documentMessage) {
      messageContent = `[Documento: ${message.documentMessage.fileName || 'Sin nombre'}]`;
      messageType = 'document';
      mediaUrl = 'pending';
    }

    // Get current group for this customer or create new one
    const now = new Date().toISOString();
    
    // Find existing group that's still active (not sent yet)
    const { data: existingMessages } = await supabase
      .from('message_queue_v2')
      .select('group_id, sequence_number')
      .eq('user_id', profile.user_id)
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

    // Insert message into queue
    const { error: insertError } = await supabase
      .from('message_queue_v2')
      .insert({
        user_id: profile.user_id,
        customer_id: customer.id,
        chat_id: chat.id,
        message_content: messageContent,
        message_type: messageType,
        media_url: mediaUrl,
        media_processed: mediaUrl === null, // Text messages are already "processed"
        group_id: groupId,
        sequence_number: sequenceNumber,
        received_at: now,
        group_last_message_at: now, // This message is now the last in group
        quoted_message_id: quotedMessageId,
        quoted_metadata: quotedMetadata,
        raw_webhook_data: payload
      });

    if (insertError) {
      console.error('[V2] Error inserting message:', insertError);
      throw insertError;
    }

    // Update group_last_message_at for ALL messages in this group
    await supabase
      .from('message_queue_v2')
      .update({ group_last_message_at: now })
      .eq('group_id', groupId)
      .eq('sent_to_webhook', false);

    console.log(`[V2] Message queued - Group: ${groupId}, Seq: ${sequenceNumber}, Type: ${messageType}`);

    // Process media in background if needed
    if (mediaUrl === 'pending') {
      // Start background processing (don't await)
      const messageId = key?.id || null;
      EdgeRuntime.waitUntil(
        processMediaInBackground(supabase, groupId, sequenceNumber, message, messageType, messageId, profile.user_id, instanceName, payload)
      );
    }

    // Schedule processing after inactivity window (debounce)
    const bufferSeconds = profile.message_buffer_v2_seconds || 10;
    EdgeRuntime.waitUntil(triggerProcessorAfterDelay(groupId, bufferSeconds, supabaseUrl, supabaseKey));

    return new Response(JSON.stringify({ 
      success: true,
      groupId,
      messageType,
      sequenceNumber
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[V2] Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processMediaInBackground(
  supabase: any,
  groupId: string,
  sequenceNumber: number,
  message: any,
  messageType: string,
  messageId: string | null,
  userId: string,
  instanceName: string | null,
  rawPayload: any
) {
  try {
    console.log(`[V2 Background] Processing ${messageType} for group ${groupId}, seq ${sequenceNumber}`);
    console.log(`[V2 Background] Looking for credentials - userId: ${userId}, instanceName: ${instanceName}`);

    // Get Evolution API credentials (prefer per-instance, then default, then payload)
    let creds: any = null;

    if (instanceName) {
      console.log(`[V2 Background] Searching by instanceName: ${instanceName} and userId: ${userId}`);
      const { data: byInstance, error: instErr } = await supabase
        .from('whatsapp_evolution_credentials')
        .select('api_url, api_key, instance_name')
        .eq('user_id', userId)
        .eq('instance_name', instanceName)
        .maybeSingle();
      console.log(`[V2 Background] Instance search result:`, { found: !!byInstance, error: instErr?.message });
      if (byInstance) {
        creds = byInstance;
        console.log(`[V2 Background] Using instance credentials: ${byInstance.instance_name}`);
      }
    }

    if (!creds) {
      console.log(`[V2 Background] Searching for default credentials for userId: ${userId}`);
      const { data: byDefault, error: defErr } = await supabase
        .from('whatsapp_evolution_credentials')
        .select('api_url, api_key, instance_name')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();
      console.log(`[V2 Background] Default search result:`, { found: !!byDefault, error: defErr?.message });
      if (byDefault) {
        creds = byDefault;
        console.log(`[V2 Background] Using default credentials: ${byDefault.instance_name}`);
      }
    }

    if (!creds) {
      console.warn('[V2 Background] No DB credentials found - trying payload fallback');
      console.warn('[V2 Background] Payload keys:', Object.keys(rawPayload || {}));
      const raw = rawPayload || null;
      if (raw?.server_url && raw?.apikey) {
        creds = {
          api_url: raw.server_url,
          api_key: raw.apikey,
          instance_name: raw.instance || raw.instanceName || raw.data?.instance || raw.instanceId || 'default'
        };
        console.warn('[V2 Background] Using HARDCODED payload credentials (NOT from DB!)');
      } else {
        console.error('[V2 Background] No Evolution credentials found (db or payload)');
        return;
      }
    }

    let mediaData;
    let fileName;
    let mimeType;

    // Get media base64 from Evolution API (align with v1: chat/getBase64FromMediaMessage using messageId)
    const instanceParam = encodeURIComponent(creds.instance_name);
    if (messageType === 'image') {
      const response = await fetch(
        `${creds.api_url}/chat/getBase64FromMediaMessage/${instanceParam}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': creds.api_key
          },
          body: JSON.stringify({
            message: { key: { id: messageId } },
            convertToMp4: false
          })
        }
      );

      if (!response.ok) {
        const t = await response.text().catch(() => '');
        console.error('[V2 Background] Evolution image fetch failed', {
          status: response.status,
          statusText: response.statusText,
          url: `${creds.api_url}/chat/getBase64FromMediaMessage/${instanceParam}`,
          instance: creds.instance_name,
          messageId,
          bodySnippet: t?.slice?.(0, 500)
        });
        return;
      }

      let result: any;
      const raw = await response.text();
      try {
        result = JSON.parse(raw);
      } catch (e) {
        console.error('[V2 Background] Evolution image JSON parse error', e, raw?.slice?.(0, 500));
        return;
      }

      const base = Array.isArray(result) ? (result[0]?.base64 || result[0]?.data) : (result?.base64 || result?.data);
      if (!base) {
        console.error('[V2 Background] No base64 in Evolution response (image)', result);
        return;
      }
      mediaData = base;
      fileName = `image_${Date.now()}.jpg`;
      mimeType = 'image/jpeg';

    } else if (messageType === 'audio') {
      const response = await fetch(
        `${creds.api_url}/chat/getBase64FromMediaMessage/${instanceParam}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': creds.api_key
          },
          body: JSON.stringify({
            message: { key: { id: messageId } },
            convertToMp4: false
          })
        }
      );

      if (!response.ok) {
        const t = await response.text().catch(() => '');
        console.error('[V2 Background] Evolution audio fetch failed', {
          status: response.status,
          statusText: response.statusText,
          url: `${creds.api_url}/chat/getBase64FromMediaMessage/${instanceParam}`,
          instance: creds.instance_name,
          messageId,
          bodySnippet: t?.slice?.(0, 500)
        });
        return;
      }

      let result: any;
      const raw = await response.text();
      try {
        result = JSON.parse(raw);
      } catch (e) {
        console.error('[V2 Background] Evolution audio JSON parse error', e, raw?.slice?.(0, 500));
        return;
      }

      const base = Array.isArray(result) ? (result[0]?.base64 || result[0]?.data) : (result?.base64 || result?.data);
      if (!base) {
        console.error('[V2 Background] No base64 in Evolution response (audio)', result);
        return;
      }
      mediaData = base;
      fileName = `audio_${Date.now()}.ogg`;
      mimeType = 'audio/ogg';
    }

    if (!mediaData) {
      console.error('[V2 Background] No media data received');
      return;
    }

    // Upload to Supabase Storage
    const bucket = 'chat-uploads';
    const filePath = `v2/${userId}/${groupId}/${fileName}`;

    // Convert base64 to blob
    const base64Data = mediaData.split(',')[1] || mediaData;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, binaryData, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error('[V2 Background] Upload error:', uploadError);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // Update message with media info
    await supabase
      .from('message_queue_v2')
      .update({
        media_processed: true,
        media_storage_path: filePath,
        media_public_url: publicUrl,
        media_metadata: {
          fileName,
          mimeType,
          bucket
        }
      })
      .eq('group_id', groupId)
      .eq('sequence_number', sequenceNumber);

    console.log(`[V2 Background] Media processed successfully: ${publicUrl}`);

  } catch (error) {
    console.error('[V2 Background] Error processing media:', error);
  }
}

// Map to track active timers per group (for debouncing)
const activeTimers = new Map<string, number>();

// Trigger the processor after the debounce window to send grouped messages
async function triggerProcessorAfterDelay(
  groupId: string, 
  delaySeconds: number, 
  supabaseUrl: string, 
  supabaseKey: string
) {
  try {
    // Cancel any existing timer for this group
    const existingTimer = activeTimers.get(groupId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      console.log(`[V2] Cancelled previous timer for group ${groupId}`);
    }

    // Set new timer
    const timerId = setTimeout(async () => {
      try {
        console.log(`[V2] Buffer complete for group ${groupId}, triggering processor`);
        const res = await fetch(`${supabaseUrl}/functions/v1/process-message-queue-v2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ 
            reason: 'debounce_timeout',
            groupId: groupId
          })
        });
        
        if (!res.ok) {
          const text = await res.text();
          console.error('[V2] Processor returned non-OK:', res.status, text);
        } else {
          console.log('[V2] Processor triggered after debounce');
        }
        
        // Remove from active timers
        activeTimers.delete(groupId);
      } catch (e) {
        console.error('[V2] Error in timer callback:', e);
        activeTimers.delete(groupId);
      }
    }, delaySeconds * 1000);

    // Store timer reference
    activeTimers.set(groupId, timerId);
    console.log(`[V2] Buffer timer set for ${delaySeconds}s for group ${groupId}`);
    
  } catch (e) {
    console.error('[V2] Error setting up debounce timer:', e);
  }
}

// Handle order creation from external requests
async function handleOrderCreation(orderData: any, supabase: any, userId: string) {
  console.log('[V2 Order] Creating order from data:', JSON.stringify(orderData, null, 2));
  
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

    console.log('[V2 Order] Creating order with data:', {
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
      console.error('[V2 Order] Error fetching store data:', storeError);
    }
    
    console.log('[V2 Order] Store data retrieved:', {
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
        console.error('[V2 Order] Error updating customer:', customerUpdateError);
      } else {
        console.log('[V2 Order] Customer updated with address info');
      }
    }

    // Calculate shipping cost from selected tariff
    if (!shipping_tariff_id) {
      console.log('[V2 Order] Missing required field: shipping_tariff_id');
      return new Response(JSON.stringify({ 
        error: 'Missing required field: shipping_tariff_id' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let shippingCost = 0;
    let selectedShippingRate = null;
    
    console.log('[V2 Order] Shipping calculation debug:', {
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
      
      console.log('[V2 Order] Available rates:', rates);
      console.log('[V2 Order] Looking for tariff:', shipping_tariff_id, 'type:', typeof shipping_tariff_id);
      
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
      
      console.log('[V2 Order] Selected shipping rate:', selectedShippingRate);
      
      if (!selectedShippingRate) {
        console.log('[V2 Order] No matching shipping rate found for:', shipping_tariff_id);
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
      console.log('[V2 Order] Applied shipping cost:', shippingCost);
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
      console.error('[V2 Order] Error creating order:', {
        error: orderError,
        user_id,
        customer_id,
        total: totalWithShipping,
        shipping_cost: shippingCost,
        shipping_tariff_id: selectedShippingRate?.id || shipping_tariff_id
      });
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('[V2 Order] Order created successfully:', newOrderData.id);

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
          console.error('[V2 Order] Could not resolve product for order item. Creating placeholder product. Incoming:', { candidateId, candidateName, product });
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
            console.error('[V2 Order] Failed to create placeholder product:', tempErr);
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
          console.error('[V2 Order] Error creating order item:', {
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
      console.log('[V2 Order] Created order items count:', createdCount);
    }

    // Try to create order in Shopify if integration exists
    try {
      console.log('[V2 Order] 🛍️ Attempting to create order in Shopify...');
      console.log('[V2 Order] Order ID:', newOrderData.id);
      console.log('[V2 Order] User ID:', user_id);
      
      const shopifyFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-shopify-order`;
      console.log('[V2 Order] Calling Shopify function at:', shopifyFunctionUrl);
      
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
      console.log('[V2 Order] Shopify function response status:', shopifyResponse.status);
      console.log('[V2 Order] Shopify function response:', shopifyResponseText);

      if (!shopifyResponse.ok) {
        console.error('[V2 Order] ❌ Error creating Shopify order. Status:', shopifyResponse.status);
        console.error('[V2 Order] Response:', shopifyResponseText);
      } else {
        console.log('[V2 Order] ✅ Shopify order created successfully');
        try {
          const shopifyData = JSON.parse(shopifyResponseText);
          console.log('[V2 Order] Shopify order data:', shopifyData);
        } catch (e) {
          console.log('[V2 Order] Could not parse Shopify response as JSON');
        }
      }
    } catch (shopifyError: any) {
      console.error('[V2 Order] 💥 Exception creating Shopify order:', shopifyError);
      console.error('[V2 Order] Error message:', shopifyError.message);
      // Don't fail the order creation if Shopify sync fails
    }

    // Send confirmation message to customer via AI agent webhook
    try {
      const confirmationMessage = `✅ ¡Perfecto! Tu pedido ha sido registrado exitosamente.

📋 **Resumen del pedido:**
${products.map((p: any) => `• ${p.nombre} (Talla: ${p.talla}) - Cantidad: ${p.cantidad} - $${p.precio.toLocaleString()}`).join('\n')}

💰 **Subtotal:** $${subtotal.toLocaleString()}
${shippingCost > 0 ? `🚚 **Envío:** $${shippingCost.toLocaleString()} (${selectedShippingRate?.name || shipping_tariff_id})` : ''}
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
        console.log('[V2 Order] Sending confirmation message to customer:', customerData.phone);
        
        // Find the user's profile to get webhook URL
        const { data: profileData } = await supabase
          .from('profiles')
          .select('webhook_url, webhook_v2_url')
          .eq('user_id', user_id)
          .single();

        const webhookUrl = profileData?.webhook_v2_url || profileData?.webhook_url;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              celular_destinario: customerData.phone,
              mensaje: confirmationMessage,
              respuesta_agente: true
            })
          });
          console.log('[V2 Order] Confirmation message sent successfully');
        }
      }
    } catch (error) {
      console.error('[V2 Order] Error sending confirmation message:', error);
      // Don't fail the order creation if message sending fails
    }

    // Assign "Pedido Nuevo" tag to customer
    try {
      console.log('[V2 Order] 🏷️ Starting tag assignment process...');
      console.log('[V2 Order] Customer ID:', customer_id);
      console.log('[V2 Order] User ID:', user_id);
      
      const tagRequestBody = {
        customer_id: customer_id,
        user_id: user_id
      };
      
      console.log('[V2 Order] Tag request body:', JSON.stringify(tagRequestBody));
      
      const tagResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/assign-order-tag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify(tagRequestBody)
      });

      console.log('[V2 Order] Tag response status:', tagResponse.status);
      const tagResponseText = await tagResponse.text();
      console.log('[V2 Order] Tag response body:', tagResponseText);

      if (tagResponse.ok) {
        console.log('[V2 Order] ✅ Tag "Pedido Nuevo" assigned successfully');
        try {
          const tagData = JSON.parse(tagResponseText);
          console.log('[V2 Order] Tag assignment result:', tagData);
        } catch (parseError) {
          console.log('[V2 Order] Could not parse tag response as JSON');
        }
      } else {
        console.error('[V2 Order] ❌ Error assigning tag. Status:', tagResponse.status);
        console.error('[V2 Order] Error response:', tagResponseText);
      }
    } catch (tagError: any) {
      console.error('[V2 Order] 💥 Exception in tag assignment:', tagError);
      console.error('[V2 Order] Tag error stack:', tagError.stack);
      // Don't fail the order creation if tag assignment fails
    }

    // Send admin notification in background (non-blocking)
    const sendNotification = async () => {
      try {
        console.log('[V2 Order] 📱 Sending admin notification...');
        
        const productList = products.map((p: any) => 
          `${p.cantidad}x ${p.nombre}${p.talla ? ` (Talla: ${p.talla})` : ''} - $${p.precio.toLocaleString()}`
        ).join('\n');
        
        const notificationMessage = `🎉 *NUEVO PEDIDO CREADO*

👤 Cliente: ${customer_name} ${customer_last_name || ''}
📍 ${customer_address}

📦 *Productos:*
${productList}

💰 *Total: $${totalWithShipping.toLocaleString()}*
💳 Forma de pago: ${forma_de_pago}

#Pedido #${newOrderData.id.slice(0, 8)}`;

        const { data, error } = await supabase.functions.invoke('send-admin-notification', {
          body: {
            user_id: user_id,
            message: notificationMessage,
            notification_type: 'new_order',
            metadata: {
              order_id: newOrderData.id,
              customer_name: customer_name,
              total_amount: totalWithShipping
            }
          }
        });
        
        if (error) {
          console.error('[V2 Order] ❌ Error sending admin notification:', error);
        } else {
          console.log('[V2 Order] ✅ Admin notification sent successfully:', data);
        }
      } catch (notifError: any) {
        console.error('[V2 Order] ❌ Exception sending admin notification:', notifError);
      }
    };

    // Execute notification in background without blocking the response
    EdgeRuntime.waitUntil(sendNotification());

    return new Response(JSON.stringify({
      success: true, 
      message: 'Order created successfully',
      order_id: newOrderData.id,
      total: total
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[V2 Order] Error in handleOrderCreation:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create order',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
