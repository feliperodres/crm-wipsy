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

    console.log('[V2 Processor] Starting message queue processing');

    // Parse optional body (may include a specific groupId to evaluate)
    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch (_) {
      // no body provided
    }
    const targetGroupId: string | undefined = reqBody?.groupId;

    // If a specific groupId was provided, only process it when it's ready (idempotent)
    if (targetGroupId) {
      // Get latest info for this group
      const { data: latestInGroup } = await supabase
        .from('message_queue_v2')
        .select('user_id, group_last_message_at')
        .eq('group_id', targetGroupId)
        .order('group_last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestInGroup) {
        console.log(`[V2 Processor] No entries found for group ${targetGroupId}`);
        return new Response(JSON.stringify({ success: true, processedGroups: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Read buffer from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('webhook_v2_url, message_buffer_v2_seconds')
        .eq('user_id', latestInGroup.user_id)
        .single();

      const bufferSeconds = (profile?.message_buffer_v2_seconds ?? 10) as number;
      const cutoffTime = new Date(Date.now() - bufferSeconds * 1000).toISOString();

      if (latestInGroup.group_last_message_at >= cutoffTime) {
        // Not ready yet; schedule a self-invoke after buffer window to avoid losing the trigger
        console.log(`[V2 Processor] Group ${targetGroupId} not ready yet (debouncing, ${bufferSeconds}s)`);
        try {
          // Re-invoke after bufferSeconds + 1s to ensure the group becomes eligible
          const delayMs = (bufferSeconds + 1) * 1000;
          EdgeRuntime.waitUntil(
            new Promise((resolve) => setTimeout(resolve, delayMs)).then(async () => {
              const { error } = await supabase.functions.invoke('process-message-queue-v2', {
                body: { groupId: targetGroupId }
              });
              if (error) console.error('[V2 Processor] Re-invoke error:', error);
              else console.log(`[V2 Processor] Re-invoked for group ${targetGroupId} after debounce`);
            })
          );
        } catch (e) {
          console.error('[V2 Processor] Failed to schedule re-invoke:', e);
        }
        return new Response(JSON.stringify({ success: true, processedGroups: 0, scheduled: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Ready: process this single group
      await processGroup(supabase, targetGroupId, profile?.webhook_v2_url);
      console.log(`[V2 Processor] Processed 1 groups`);
      return new Response(JSON.stringify({ success: true, processedGroups: 1 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Manual scan: find all users with v2 enabled and process their ready groups
    const now = new Date();
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, webhook_v2_url, message_buffer_v2_seconds')
      .eq('use_webhook_v2', true)
      .not('webhook_v2_url', 'is', null);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No users with v2 enabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const processedGroups: string[] = [];

    for (const profile of profiles) {
      const bufferSeconds = profile.message_buffer_v2_seconds || 10;
      const cutoffTime = new Date(now.getTime() - (bufferSeconds * 1000)).toISOString();

      const { data: groups } = await supabase
        .from('message_queue_v2')
        .select('group_id')
        .eq('user_id', profile.user_id)
        .eq('sent_to_webhook', false)
        .lt('group_last_message_at', cutoffTime)
        .order('group_last_message_at', { ascending: true });

      if (groups && groups.length > 0) {
        const uniqueGroups = Array.from(new Set(groups.map(g => g.group_id)));
        for (const gid of uniqueGroups) {
          await processGroup(supabase, gid, profile.webhook_v2_url);
          processedGroups.push(gid);
        }
      }
    }

    console.log(`[V2 Processor] Processed ${processedGroups.length} groups`);
    return new Response(JSON.stringify({ success: true, processedGroups: processedGroups.length, groups: processedGroups }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[V2 Processor] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processGroup(supabase: any, groupId: string, webhookUrl: string) {
  try {
    console.log(`[V2 Processor] Processing group: ${groupId}`);

    // OPTIMISTIC LOCK: Check if this group is already being processed
    const { data: lockCheck } = await supabase
      .from('message_queue_v2')
      .select('processing_started_at')
      .eq('group_id', groupId)
      .eq('sent_to_webhook', false)
      .limit(1)
      .maybeSingle();

    // If already being processed within last 30s, skip (another instance is handling it)
    if (lockCheck?.processing_started_at) {
      const lockAge = Date.now() - new Date(lockCheck.processing_started_at).getTime();
      if (lockAge < 30000) {
        console.log(`[V2 Processor] Group ${groupId} already being processed (lock age: ${lockAge}ms), skipping`);
        return;
      }
      console.log(`[V2 Processor] Stale lock detected for group ${groupId} (age: ${lockAge}ms), proceeding`);
    }

    // Acquire lock by marking processing_started_at
    console.log(`[V2 Processor] Acquiring lock for group: ${groupId}`);
    await supabase
      .from('message_queue_v2')
      .update({ processing_started_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('sent_to_webhook', false);

    // Ensure env vars are available inside this scope for direct function calls
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get all messages in this group
    const { data: messages, error: messagesError } = await supabase
      .from('message_queue_v2')
      .select('*')
      .eq('group_id', groupId)
      .eq('sent_to_webhook', false)
      .order('sequence_number', { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      console.error(`[V2 Processor] No messages found for group ${groupId}`);
      return;
    }

    // Wait for media (up to 15s) so audio/image URLs arrive in the webhook
    let usedMessages = messages as any[];
    const startWait = Date.now();
    const maxWaitMs = 15000;
    const pollMs = 1000;

    const hasPending = (msgs: any[]) =>
      msgs.some(m => m.message_type !== 'text' && m.media_processed !== true);

    if (hasPending(usedMessages)) {
      console.log(`[V2 Processor] Group ${groupId} has pending media - waiting up to ${maxWaitMs/1000}s`);
      while (hasPending(usedMessages) && (Date.now() - startWait) < maxWaitMs) {
        await new Promise((r) => setTimeout(r, pollMs));
        const { data: refreshed } = await supabase
          .from('message_queue_v2')
          .select('*')
          .eq('group_id', groupId)
          .eq('sent_to_webhook', false)
          .order('sequence_number', { ascending: true });
        if (refreshed && refreshed.length > 0) {
          usedMessages = refreshed;
        }
      }

      if (hasPending(usedMessages)) {
        console.log(`[V2 Processor] Pending media still not ready after wait - will send without URLs`);
      } else {
        console.log('[V2 Processor] All media processed within wait window');
      }
    } else {
      console.log(`[V2 Processor] Processing group ${groupId} with ${usedMessages.length} messages (no pending media)`);
    }

    // Get customer and user info
    const firstMessage = usedMessages[0];
    const { data: customer } = await supabase
      .from('customers')
      .select('name, phone, email, address, city, province')
      .eq('id', firstMessage.customer_id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', firstMessage.user_id)
      .single();

    const { data: chat } = await supabase
      .from('chats')
      .select('*, ai_agent_enabled')
      .eq('id', firstMessage.chat_id)
      .single();

    // Detectar si hay imagen o audio en los mensajes (igual que V1)
    let imageUrl = null;
    let audioUrl = null;
    let hasImage = false;
    let hasAudio = false;

    usedMessages.forEach(msg => {
      if (msg.message_type === 'image' && msg.media_public_url) {
        imageUrl = msg.media_public_url;
        hasImage = true;
      } else if (msg.message_type === 'audio' && msg.media_public_url) {
        audioUrl = msg.media_public_url;
        hasAudio = true;
      }
    });

    // Format messages for webhook
    const formattedMessages = usedMessages.map(msg => ({
      type: msg.message_type,
      content: msg.message_content,
      mediaUrl: msg.media_public_url || null,
      timestamp: msg.received_at,
      quotedMessage: msg.quoted_metadata || null
    }));

    // ===== WELCOME FLOW DETECTION (BEFORE persisting messages) =====
    // Check if this is the customer's first message by counting EXISTING messages
    const { count: existingMessageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('chat_id', firstMessage.chat_id)
      .eq('sender_type', 'customer');

    const isFirstMessage = (existingMessageCount || 0) === 0;
    let welcomeFlowExecuted = false;
    
    if (isFirstMessage) {
      console.log(`[V2 Processor] First message detected for chat ${firstMessage.chat_id}, checking for welcome flows...`);
      
      // Check for active flows with on_first_message trigger
      const { data: welcomeFlows } = await supabase
        .from('automation_flows')
        .select('id, name, trigger_conditions')
        .eq('user_id', firstMessage.user_id)
        .eq('is_active', true);

      // Filter for flows that have on_first_message enabled **and** are NOT time-based (no inactivity/no_response configured)
      const firstMessageFlows = welcomeFlows?.filter((flow: any) => {
        const conditions = flow.trigger_conditions || {};
        const isFirstMessageEnabled = conditions.on_first_message === true;
        const hasInactivityTrigger =
          conditions.on_inactivity?.enabled === true ||
          conditions.on_no_response?.enabled === true;
        // Only treat as "welcome" if it's purely first-message, without time triggers
        return isFirstMessageEnabled && !hasInactivityTrigger;
      });

      if (firstMessageFlows && firstMessageFlows.length > 0) {
        const flow = firstMessageFlows[0];
        console.log(`[V2 Processor] Found flow with on_first_message trigger: ${flow.name} (${flow.id})`);

        // Check if this flow was already executed for this chat with first_message trigger
        const { data: existingExecution } = await supabase
          .from('flow_executions')
          .select('id')
          .eq('flow_id', flow.id)
          .eq('chat_id', firstMessage.chat_id)
          .eq('trigger_type', 'first_message')
          .limit(1)
          .single();

        if (existingExecution) {
          console.log(`[V2 Processor] Flow ${flow.id} already executed for chat ${firstMessage.chat_id}, skipping`);
        } else {
          console.log(`[V2 Processor] Executing welcome flow: ${flow.name} (${flow.id})`);
          
          try {
            const { error: flowError } = await supabase.functions.invoke('execute-flow', {
              body: {
                flowId: flow.id,
                customerId: firstMessage.customer_id,
                chatId: firstMessage.chat_id,
                userId: firstMessage.user_id,
                triggerType: 'first_message',
              },
            });

            if (flowError) {
              console.error('[V2 Processor] Error executing welcome flow:', flowError);
              // Continue to persist messages and potentially send to agent
            } else {
              console.log('[V2 Processor] Welcome flow executed successfully');
              welcomeFlowExecuted = true;
            }
          } catch (flowExecError) {
            console.error('[V2 Processor] Exception executing welcome flow:', flowExecError);
          }
        }
      } else {
        console.log('[V2 Processor] No active flows with on_first_message trigger found');
      }
    }
    // ===== END WELCOME FLOW DETECTION =====

    // ALWAYS persist customer messages to messages table FIRST (before webhook)
    console.log('[V2 Processor] Persisting customer messages to messages table');
    for (const msg of usedMessages) {
      let metadata = null;
      if (msg.media_public_url) {
        if (msg.message_type === 'image') {
          metadata = { imageUrl: msg.media_public_url };
        } else if (msg.message_type === 'audio') {
          metadata = { audioUrl: msg.media_public_url };
        } else {
          metadata = { media_url: msg.media_public_url };
        }
      }

      // Add quoted message metadata if exists
      if (msg.quoted_metadata) {
        metadata = { ...metadata, quotedMessage: msg.quoted_metadata };
      }

      // Extract whatsapp_message_id for idempotency
      const whatsappMsgId = msg.media_metadata?.whatsapp_message_id || null;

      // Check if already exists to avoid duplicates
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', msg.chat_id)
        .eq('whatsapp_message_id', whatsappMsgId)
        .maybeSingle();

      if (!existingMsg && whatsappMsgId) {
        await supabase
          .from('messages')
          .insert({
            chat_id: msg.chat_id,
            content: msg.message_content,
            sender_type: 'customer',
            message_type: msg.message_type,
            whatsapp_message_id: whatsappMsgId,
            metadata: metadata
          });
        console.log(`[V2 Processor] Customer message persisted: ${msg.message_type}`);
      } else if (!whatsappMsgId) {
        // No whatsapp ID, insert anyway (rare case)
        await supabase
          .from('messages')
          .insert({
            chat_id: msg.chat_id,
            content: msg.message_content,
            sender_type: 'customer',
            message_type: msg.message_type,
            metadata: metadata
          });
        console.log(`[V2 Processor] Customer message persisted (no WA ID): ${msg.message_type}`);
      }
    }

    // Mark messages as sent (they're now persisted)
    await supabase
      .from('message_queue_v2')
      .update({
        sent_to_webhook: true,
        sent_at: new Date().toISOString()
      })
      .eq('group_id', groupId);

    console.log('[V2 Processor] Customer messages persistence completed');

    // If welcome flow was executed, skip sending to agent webhook
    if (welcomeFlowExecuted) {
      console.log('[V2 Processor] Welcome flow handled the message, skipping agent webhook');
      
      // Update chat last_message_at
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', firstMessage.chat_id);
      
      return;
    }

    // Check if AI agent is enabled for this chat (early check)
    if (!chat?.ai_agent_enabled) {
      console.log(`[V2 Processor] AI agent disabled for chat ${firstMessage.chat_id}, skipping webhook`);
      
      // Update chat last_message_at
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', firstMessage.chat_id);
      
      return;
    }

    // Check if webhook is configured before attempting to send
    if (!webhookUrl || webhookUrl.trim() === '') {
      console.log('[V2 Processor] No webhook URL configured, skipping agent processing');
      
      // Update chat last_message_at
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', firstMessage.chat_id);
      
      return;
    }

    // Check if user has reached AI message limit (FREE plan)
    if (profile?.ai_messages_blocked) {
      console.log(`[V2 Processor] User ${firstMessage.user_id} has reached AI message limit - blocking message`);
      
      // Disable AI agent for this chat to require human supervision
      await supabase
        .from('chats')
        .update({ 
          ai_agent_enabled: false,
          last_message_at: new Date().toISOString()
        })
        .eq('id', firstMessage.chat_id);
      
      console.log('[V2 Processor] Chat marked for human supervision due to limit');
      
      return;
    }

    // Get featured products (from special_instructions)
    let featuredProducts = [];
    if (profile?.special_instructions) {
      const productIds = extractProductIds(profile.special_instructions);
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, description, price, images, category')
          .eq('user_id', firstMessage.user_id)
          .in('id', productIds);
        
        featuredProducts = products || [];
      }
    }

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(firstMessage.user_id);
    const userEmail = authUser?.user?.email || '';

    // Get store settings
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('*')
      .eq('user_id', firstMessage.user_id)
      .single();

    // Build user hash (base64 encode - must be base64(email) to match V1)
    const userHash = btoa(userEmail);
    console.log(`[V2 Processor] userEmail: ${userEmail}, userHash: ${userHash.substring(0,8)}...`);
    
    // Build store URL if exists (prefer custom domain)
    const storeUrl = storeSettings?.custom_domain
      ? `https://${storeSettings.custom_domain}`
      : (storeSettings?.store_slug ? `https://yourapp.com/store/${storeSettings.store_slug}` : null);

    // Get shipping rates from store settings
    const shippingRates = storeSettings?.shipping_rates || [];

    // Compose store payload (mirror V1 structure)
    const store = storeSettings ? {
      id: storeSettings.id,
      storeName: storeSettings.store_name,
      storeDescription: storeSettings.store_description,
      logoUrl: storeSettings.logo_url,
      bannerUrl: storeSettings.banner_url,
      primaryColor: storeSettings.primary_color,
      accentColor: storeSettings.accent_color,
      storeSlug: storeSettings.store_slug,
      customDomain: storeSettings.custom_domain,
      whatsappNumber: storeSettings.whatsapp_number,
      contact: {
        email: storeSettings.contact_email,
        phone: storeSettings.contact_phone,
        address: storeSettings.address,
      },
      socialMedia: storeSettings.social_media || {},
      paymentMethods: storeSettings.payment_methods || {},
      shippingRates: shippingRates,
      url: storeUrl,
      isActive: storeSettings.is_active,
    } : null;

    // Quoted message - obtener el primero que tenga quotedMessage
    const quotedMessage = formattedMessages.find(m => m.quotedMessage)?.quotedMessage || null;

    // Build webhook payload (igual formato que V1)
    const webhookPayload = {
      // Información del usuario/negocio
      userEmail,
      userId: firstMessage.user_id,
      userHash,
      
      // Información del cliente (campos sueltos para compatibilidad)
      customerName: customer?.name || 'Unknown',
      customerPhone: customer?.phone || '',
      customerUid: firstMessage.customer_id,
      
      // Información del cliente (objeto detallado)
      customer: {
        id: firstMessage.customer_id,
        name: customer?.name || 'Unknown',
        phone: customer?.phone || '',
        email: customer?.email || null,
        address: customer?.address || null,
        city: customer?.city || null,
        province: customer?.province || null,
      },
      
      // Mensajes
      messageContent: formattedMessages.map(m => m.content).join('\n'),
      messageType: formattedMessages[0]?.type || 'text',
      messages: formattedMessages,
      messageCount: messages.length,
      
      // Media (formato V1)
      imagen: imageUrl,
      audio: audioUrl,
      hasImagen: hasImage,
      hasAudio: hasAudio,
      quotedMessage,
      
      // Información de la tienda
      storeInfo: profile?.store_info || '',
      storeUrl,
      website: profile?.website || '',
      store, // objeto completo con todos los datos de tienda
      
      // Configuración del agente
      agentName: profile?.agent_name || 'Asistente Virtual',
      proactivityLevel: profile?.proactivity_level || 'reactive',
      customerTreatment: profile?.customer_treatment || 'tu',
      welcomeMessage: profile?.welcome_message || 'Hola! Soy tu asistente virtual, ¿en qué puedo ayudarte hoy?',
      callToAction: profile?.call_to_action || '¿Te gustaría que procese tu pedido?',
      specialInstructions: profile?.special_instructions || '',
      
      // Ventas y pagos
      salesMode: profile?.sales_mode || 'advise_only',
      paymentMethods: profile?.payment_methods || 'both',
      paymentAccounts: profile?.payment_accounts || [],
      
      // Envíos
      shippingRates,
      
      // Productos destacados
      featuredProducts,
      
      // IDs de referencia
      chatId: chat?.id,
      
      // Timestamp
      timestamp: new Date().toISOString()
    };

    // Send to webhook
    console.log(`[V2 Processor] Sending to webhook: ${webhookUrl}`);
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      console.error(`[V2 Processor] Webhook error: ${webhookResponse.status}`);
      throw new Error(`Webhook returned ${webhookResponse.status}`);
    }

    console.log('[V2 Processor] Webhook sent successfully');

    // Process agent response
    const agentResponse = await webhookResponse.json();
    console.log('[V2 Processor] Agent response received:', agentResponse);

    // Determine Meta credentials using chat.instance_name when available
    let metaCreds: { phone_number_id: string; access_token: string } | null = null;
    let usesMeta = false;

    if (chat?.instance_name && typeof chat.instance_name === 'string' && chat.instance_name.startsWith('meta_')) {
      const phoneNumberId = chat.instance_name.replace('meta_', '');
      console.log('[V2 Processor] Extracted phoneNumberId from chat.instance_name:', phoneNumberId);
      const { data: specificCreds, error: metaErr } = await supabase
        .from('whatsapp_meta_credentials')
        .select('phone_number_id, access_token')
        .eq('user_id', firstMessage.user_id)
        .eq('phone_number_id', phoneNumberId)
        .maybeSingle();
      if (metaErr) {
        console.error('[V2 Processor] Error fetching specific Meta creds:', metaErr);
      } else if (specificCreds) {
        metaCreds = specificCreds;
        usesMeta = true;
      }
    }

    if (!usesMeta) {
      const { data: metaRows, error: metaErr } = await supabase
        .from('whatsapp_meta_credentials')
        .select('phone_number_id, access_token, created_at')
        .eq('user_id', firstMessage.user_id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (metaErr) console.error('[V2 Processor] Meta creds query error:', metaErr);
      metaCreds = metaRows?.[0] || null;
      usesMeta = !!metaCreds;
    }
    console.log('[V2 Processor] Using Meta:', usesMeta, 'phoneNumberId:', metaCreds?.phone_number_id);

    // Extract agent response with robust key mapping
    const extractText = (r: any): string | undefined => {
      if (!r) return undefined;
      const candidates: any[] = [
        r?.mensaje_agente,
        r?.respuesta_agente,
        r?.ai_message,
        r?.assistant_message,
        r?.assistant_reply,
        r?.reply,
        r?.text,
        r?.message,
        r?.data?.mensaje_agente,
        r?.data?.respuesta_agente,
        r?.data?.text,
        r?.data?.message,
        Array.isArray(r?.messages) ? r.messages.join('\n') : undefined,
        typeof r === 'string' ? r : undefined,
      ].filter((v) => typeof v === 'string');

      const primary = (candidates.find(Boolean) as string | undefined)?.toString().trim();
      if (!primary) return undefined;

      const normalized = primary.replace(/\s+/g, ' ').trim();
      const placeholders = ['workflow was started', 'ok', 'started', 'success', 'accepted', 'received'];
      if (placeholders.includes(normalized.toLowerCase())) return undefined;
      if (normalized.length < 3) return undefined;
      return normalized;
    };

    const agentMessageText = extractText(agentResponse);
    console.log('[V2 Processor] Agent response parsed text:', agentMessageText);

    // Send agent response back to customer if available
    if (agentMessageText && customer?.phone) {
      const phoneRaw = String(customer.phone);
      const phoneSanitized = phoneRaw.replace(/\D/g, '');
      console.log(`[V2 Processor] Sending agent response to ${phoneSanitized}`);

      let outboundMessageId: string | null = null;

      if (usesMeta && metaCreds?.phone_number_id) {
        // Send using Meta WhatsApp API via edge function
        const { data: metaSendRes, error: sendError } = await supabase.functions.invoke('send-whatsapp-meta-message', {
          body: {
            phoneNumberId: metaCreds.phone_number_id,
            to: phoneSanitized,
            type: 'text',
            message: agentMessageText,
            chatId: chat?.id,
            isAgentMessage: true
          }
        });
        if (sendError) {
          console.error('[V2 Processor] Meta send failed:', sendError);
        } else {
          outboundMessageId = metaSendRes?.messageId || metaSendRes?.data?.messages?.[0]?.id || null;
          console.log('[V2 Processor] Meta send success, messageId:', outboundMessageId);
        }
      } else {
        // Send using Evolution API
        const evoUrl = `${supabaseUrl}/functions/v1/send-whatsapp-message`;
        const res = await fetch(evoUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            number: phoneSanitized,
            text: agentMessageText,
            userEmail
          })
        });
        const bodyText = await res.text();
        console.log('[V2 Processor] Evolution send status:', res.status, 'body:', bodyText.slice(0, 500));
        if (!res.ok) {
          console.error('[V2 Processor] Evolution send failed:', res.status, bodyText);
        }
      }

      // Save agent message to database
      await supabase
        .from('messages')
        .insert({
          chat_id: firstMessage.chat_id,
          content: agentMessageText,
          sender_type: 'agent',
          message_type: 'text',
          whatsapp_message_id: outboundMessageId || null
        });

      console.log('[V2 Processor] Agent message saved to database');
    } else {
      console.log('[V2 Processor] No valid agent text response or missing customer phone; skipping outbound. Raw agentResponse keys:', Object.keys(agentResponse || {}));
    }

    // Update chat last_message_at
    await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', firstMessage.chat_id);

    console.log(`[V2 Processor] Group ${groupId} processed successfully`);

  } catch (error) {
    console.error(`[V2 Processor] Error processing group ${groupId}:`, error);
    throw error;
  } finally {
    // Always clear the lock when done (success or error)
    try {
      await supabase
        .from('message_queue_v2')
        .update({ processing_started_at: null })
        .eq('group_id', groupId);
      console.log(`[V2 Processor] Lock released for group: ${groupId}`);
    } catch (lockError) {
      console.error(`[V2 Processor] Failed to release lock for group ${groupId}:`, lockError);
    }
  }
}

function extractProductIds(specialInstructions: string): string[] {
  const ids: string[] = [];
  
  // Extract UUIDs
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const uuidMatches = specialInstructions.match(uuidRegex);
  if (uuidMatches) {
    ids.push(...uuidMatches);
  }
  
  return ids;
}


