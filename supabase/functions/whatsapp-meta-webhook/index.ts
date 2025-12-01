import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const url = new URL(req.url);
  
  // Verificación inicial del webhook (GET request)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    
    console.log('Webhook verification request:', { mode, token: token?.substring(0, 10), challenge });
    
    if (mode === 'subscribe' && token) {
      // Buscar el token en la base de datos
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      console.log('Looking for verify_token:', token);
      
      const { data: credentials, error: queryError } = await supabase
        .from('whatsapp_meta_credentials')
        .select('verify_token, phone_number_id, user_id')
        .eq('verify_token', token)
        .single();
      
      if (queryError) {
        console.error('Database query error:', queryError);
      }
      
      if (credentials) {
        console.log('Webhook verified successfully with token from database for phone_number_id:', credentials.phone_number_id);
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
      // Si no se encuentra, mostrar los tokens disponibles (solo primeros caracteres por seguridad)
      const { data: allTokens } = await supabase
        .from('whatsapp_meta_credentials')
        .select('verify_token, phone_number_id');
      
      console.error('Token not found. Available tokens:', allTokens?.map(t => ({
        token_preview: t.verify_token?.substring(0, 20) + '...',
        phone_number_id: t.phone_number_id
      })));
    }
    
    console.error('Webhook verification failed - token not found in database');
    return new Response('Forbidden', { status: 403 });
  }

  // Procesar webhook (POST request)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('Webhook received:', JSON.stringify(body, null, 2));
      
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

            console.log('Processing messages:', messages.length);

            for (const message of messages) {
              // Buscar credenciales del usuario usando phone_number_id
              const { data: credentials } = await supabase
                .from('whatsapp_meta_credentials')
                .select('user_id, phone_number_id')
                .eq('phone_number_id', metadata.phone_number_id)
                .single();

              if (!credentials) {
                console.error('No credentials found for phone_number_id:', metadata.phone_number_id);
                continue;
              }

              const userId = credentials.user_id;

              // Check if user has v2 enabled - if so, skip processing here
              const { data: profile } = await supabase
                .from('profiles')
                .select('use_webhook_v2')
                .eq('user_id', userId)
                .single();

              if (profile?.use_webhook_v2) {
                console.log('[Meta V1] User has v2 enabled, forwarding payload to v2 function');
                try {
                  const { data, error } = await supabase.functions.invoke('whatsapp-meta-webhook-v2', {
                    body
                  });
                  if (error) {
                    console.error('[Meta V1] Error forwarding to v2:', error);
                  } else {
                    console.log('[Meta V1] Forwarded to v2 successfully');
                  }
                } catch (e) {
                  console.error('[Meta V1] Exception while forwarding to v2:', e);
                }
                continue;
              }

              const from = message.from;
              
              // Buscar o crear cliente
              let { data: customer } = await supabase
                .from('customers')
                .select('id, name')
                .eq('user_id', userId)
                .eq('phone', from)
                .single();

              if (!customer) {
                const contactInfo = contacts.find(c => c.wa_id === from);
                const { data: newCustomer } = await supabase
                  .from('customers')
                  .insert({
                    user_id: userId,
                    phone: from,
                    whatsapp_id: from,
                    name: contactInfo?.profile?.name || from,
                    last_seen: new Date().toISOString()
                  })
                  .select()
                  .single();

                customer = newCustomer;
              }

              if (!customer) {
                console.error('Failed to create/find customer');
                continue;
              }

              // Buscar o crear chat
              let { data: chat } = await supabase
                .from('chats')
                .select('id')
                .eq('user_id', userId)
                .eq('customer_id', customer.id)
                .eq('instance_name', `meta_${metadata.phone_number_id}`)
                .single();

              if (!chat) {
                const { data: newChat } = await supabase
                  .from('chats')
                  .insert({
                    user_id: userId,
                    customer_id: customer.id,
                    instance_name: `meta_${metadata.phone_number_id}`,
                    whatsapp_chat_id: from,
                    status: 'active',
                    last_message_at: new Date().toISOString()
                  })
                  .select()
                  .single();

                chat = newChat;
              }

              if (!chat) {
                console.error('Failed to create/find chat');
                continue;
              }

              // Preparar contenido del mensaje
              let content = '';
              let messageType = 'text';
              let metadata_json: any = {
                whatsapp_message_id: message.id,
                timestamp: message.timestamp
              };

              if (message.type === 'text') {
                content = message.text.body;
              } else if (message.type === 'image') {
                messageType = 'image';
                content = message.image.caption || 'Imagen recibida';
                metadata_json.media_id = message.image.id;
                metadata_json.mime_type = message.image.mime_type;
                
                // Descargar y guardar imagen
                try {
                  const imageUrl = await downloadAndStoreMedia(
                    message.image.id,
                    credentials.user_id,
                    metadata.phone_number_id,
                    'image',
                    supabase
                  );
                  if (imageUrl) {
                    metadata_json.imageUrl = imageUrl;
                  }
                } catch (error) {
                  console.error('Error downloading image:', error);
                }
              } else if (message.type === 'video') {
                messageType = 'video';
                content = message.video.caption || 'Video recibido';
                metadata_json.media_id = message.video.id;
                metadata_json.mime_type = message.video.mime_type;
              } else if (message.type === 'audio') {
                messageType = 'audio';
                content = 'Audio recibido';
                metadata_json.media_id = message.audio.id;
                metadata_json.mime_type = message.audio.mime_type;
                
                // Descargar y guardar audio
                try {
                  const audioUrl = await downloadAndStoreMedia(
                    message.audio.id,
                    credentials.user_id,
                    metadata.phone_number_id,
                    'audio',
                    supabase
                  );
                  if (audioUrl) {
                    metadata_json.audioUrl = audioUrl;
                  }
                } catch (error) {
                  console.error('Error downloading audio:', error);
                }
              } else if (message.type === 'document') {
                messageType = 'document';
                content = message.document.filename || 'Documento recibido';
                metadata_json.media_id = message.document.id;
                metadata_json.mime_type = message.document.mime_type;
              } else {
                content = `Mensaje de tipo ${message.type}`;
                metadata_json.original_type = message.type;
              }

              // Guardar mensaje
              const { data: savedMessage } = await supabase
                .from('messages')
                .insert({
                  chat_id: chat.id,
                  content: content,
                  sender_type: 'customer',
                  message_type: messageType,
                  whatsapp_message_id: message.id,
                  status: 'received',
                  is_read: false,
                  metadata: metadata_json,
                  timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
                })
                .select()
                .single();

              // Actualizar última actividad del chat
              await supabase
                .from('chats')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', chat.id);

              console.log('Message saved successfully');

              // Enviar al agente IA (flujo v1)
              if (savedMessage) {
                try {
                  const { error: webhookError } = await supabase.functions.invoke('send-ai-agent-webhook', {
                    body: {
                      chatId: chat.id,
                      messageId: savedMessage.id,
                      userId: userId
                    }
                  });
                  
                  if (webhookError) {
                    console.error('[Meta V1] Error invoking AI agent:', webhookError);
                  } else {
                    console.log('[Meta V1] Message sent to AI agent successfully');
                  }
                } catch (e) {
                  console.error('[Meta V1] Exception while sending to AI agent:', e);
                }
              }
            }

            // Procesar estados de mensaje si existen
            if (value.statuses) {
              for (const status of value.statuses) {
                await supabase
                  .from('messages')
                  .update({ status: status.status })
                  .eq('whatsapp_message_id', status.id);

                console.log('Message status updated:', status.id, status.status);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error processing webhook:', error);
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

// Función para descargar y guardar media de Meta
async function downloadAndStoreMedia(
  mediaId: string,
  userId: string,
  phoneNumberId: string,
  mediaType: 'image' | 'audio',
  supabase: any
): Promise<string | null> {
  try {
    // Obtener access_token
    const { data: credentials } = await supabase
      .from('whatsapp_meta_credentials')
      .select('access_token')
      .eq('phone_number_id', phoneNumberId)
      .single();

    if (!credentials?.access_token) {
      console.error('No access token found');
      return null;
    }

    // 1. Obtener URL del media
    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      }
    );

    if (!mediaInfoResponse.ok) {
      console.error('Error fetching media info:', await mediaInfoResponse.text());
      return null;
    }

    const mediaInfo = await mediaInfoResponse.json();
    const mediaUrl = mediaInfo.url;

    // 2. Descargar el archivo
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`
      }
    });

    if (!mediaResponse.ok) {
      console.error('Error downloading media:', await mediaResponse.text());
      return null;
    }

    const mediaBlob = await mediaResponse.blob();
    const arrayBuffer = await mediaBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 3. Determinar extensión del archivo
    const mimeType = mediaInfo.mime_type || 'application/octet-stream';
    let extension = 'bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
    else if (mimeType.includes('png')) extension = 'png';
    else if (mimeType.includes('webp')) extension = 'webp';
    else if (mimeType.includes('ogg')) extension = 'ogg';
    else if (mimeType.includes('mpeg')) extension = 'mp3';
    else if (mimeType.includes('mp4')) extension = 'mp4';

    // 4. Subir a Supabase Storage
    const fileName = `${userId}/${mediaType}s/${Date.now()}_${mediaId}.${extension}`;
    const bucketName = mediaType === 'image' ? 'chat-images' : 'chat-audios';

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      return null;
    }

    // 5. Obtener URL pública
    const { data: urlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log(`${mediaType} stored successfully:`, urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('Error in downloadAndStoreMedia:', error);
    return null;
  }
}
