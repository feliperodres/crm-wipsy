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
    const requestBody = await req.json();
    const { phoneNumberId, userId, to, message, type = 'text', mediaUrl, caption, templateName, templateLanguage, templateComponents, chatId, isAgentMessage } = requestBody;
    
    console.log('Sending Meta WhatsApp message:', { phoneNumberId, userId, to, type });
    
    if ((!phoneNumberId && !userId) || !to) {
      throw new Error('Missing required parameters: phoneNumberId or userId, and to');
    }
    
    if (type === 'text' && !message) {
      throw new Error('Message is required for text type');
    }
    
    if (['image', 'video', 'document', 'audio'].includes(type) && !mediaUrl) {
      throw new Error('mediaUrl is required for media types');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obtener access token (por phoneNumberId o por userId como fallback)
    let resolvedPhoneNumberId = phoneNumberId as string | undefined;
    let creds: any = null;

    if (resolvedPhoneNumberId) {
      const { data, error } = await supabase
        .from('whatsapp_meta_credentials')
        .select('access_token, user_id, phone_number_id')
        .eq('phone_number_id', resolvedPhoneNumberId)
        .maybeSingle();
      creds = data;
      if (error) console.error('Error fetching creds by phoneNumberId:', error);
    }

    if (!creds && userId) {
      const { data, error } = await supabase
        .from('whatsapp_meta_credentials')
        .select('access_token, user_id, phone_number_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error('Error fetching creds by userId:', error);
      if (data) {
        creds = data;
        resolvedPhoneNumberId = data.phone_number_id;
      }
    }

    if (!creds || !resolvedPhoneNumberId) {
      throw new Error('Credentials not found for provided phoneNumberId or userId');
    }

    console.log('Credentials found, sending message with phoneNumberId:', resolvedPhoneNumberId);

    // Preparar el cuerpo del mensaje según el tipo
    let messageBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: type
    };

    if (type === 'template') {
      // Template message
      if (!templateName || !templateLanguage) {
        throw new Error('templateName and templateLanguage are required for template type');
      }
      messageBody.template = {
        name: templateName,
        language: {
          code: templateLanguage
        }
      };
      if (templateComponents && templateComponents.length > 0) {
        messageBody.template.components = templateComponents;
      }
    } else if (type === 'text') {
      messageBody.text = { body: message };
    } else if (type === 'image' && mediaUrl) {
      messageBody.image = {
        link: mediaUrl,
        caption: caption || message
      };
    } else if (type === 'video' && mediaUrl) {
      messageBody.video = {
        link: mediaUrl,
        caption: caption || message
      };
    } else if (type === 'document' && mediaUrl) {
      messageBody.document = {
        link: mediaUrl,
        caption: caption || message
      };
    } else if (type === 'audio' && mediaUrl) {
      messageBody.audio = {
        link: mediaUrl
      };
    } else {
      throw new Error(`Unsupported message type: ${type}`);
    }

    // Enviar mensaje vía Meta API (Graph v22.0)
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${resolvedPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let metaError: any = null;
      try { metaError = JSON.parse(errorText); } catch { /* ignore */ }
      console.error('Meta API error:', metaError || errorText);
      const errMessage = metaError?.error?.message || metaError?.error?.error_user_msg || errorText;
      throw new Error(`Meta API error: ${errMessage}`);
    }

    const result = await response.json();
    console.log('Message sent successfully:', result);

    const messageId = result.messages?.[0]?.id;

    // Guardar el mensaje en la base de datos si hay chatId
    if (chatId && messageId) {
      console.log('Saving message to database...', { chatId, messageId, type });
      
      let messageContent = '';
      let messageMetadata: any = {};

      if (type === 'text') {
        messageContent = message;
      } else if (type === 'image' && mediaUrl) {
        messageContent = caption || message || '[Imagen]';
        messageMetadata.imageUrl = mediaUrl;
      } else if (type === 'video' && mediaUrl) {
        messageContent = caption || message || '[Video]';
        messageMetadata.videoUrl = mediaUrl;
      } else if (type === 'document' && mediaUrl) {
        messageContent = caption || message || '[Documento]';
        messageMetadata.documentUrl = mediaUrl;
      } else if (type === 'audio' && mediaUrl) {
        messageContent = '[Audio]';
        messageMetadata.audioUrl = mediaUrl;
      }

      const { error: dbError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          content: messageContent,
          sender_type: isAgentMessage ? 'agent' : 'business',
          message_type: type,
          whatsapp_message_id: messageId,
          metadata: messageMetadata,
          is_read: true
        });

      if (dbError) {
        console.error('Error saving message to database:', dbError);
      } else {
        console.log('Message saved to database successfully');
        // Update chat last_message_at for UI refresh
        const { error: chatUpdateError } = await supabase
          .from('chats')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', chatId);
        if (chatUpdateError) {
          console.error('Error updating chat last_message_at:', chatUpdateError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
        data: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error sending message:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
