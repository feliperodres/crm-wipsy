// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  message: string;
  notification_type: 'new_order' | 'customer_assistance' | 'urgent_support';
  metadata?: {
    customer_name?: string;
    order_id?: string;
    customer_phone?: string;
    total_amount?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotificationRequest = await req.json();
    const { user_id, message, notification_type, metadata } = body;

    console.log('Sending admin notification:', {
      user_id,
      notification_type,
      metadata
    });

    // Validate required fields
    if (!user_id || !message || !notification_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, message, notification_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile to retrieve notification phone
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notification_phone, business_name, email')
      .eq('user_id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Could not fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if notification phone is configured
    if (!profile?.notification_phone) {
      console.log('No notification phone configured for user:', user_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No notification phone configured' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format message based on notification type
    let formattedMessage = '';
    const businessName = profile.business_name || 'Tu tienda';

    switch (notification_type) {
      case 'new_order':
        const customerName = metadata?.customer_name || 'Cliente';
        const totalAmount = metadata?.total_amount ? 
          new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
          }).format(metadata.total_amount) : '';
        
        formattedMessage = `🛒 *NUEVO PEDIDO - ${businessName}*\n\n` +
          `📋 *Cliente:* ${customerName}\n` +
          (totalAmount ? `💰 *Total:* ${totalAmount}\n` : '') +
          `📱 *Detalles:* ${message}\n\n` +
          `⏰ ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`;
        break;

      case 'customer_assistance':
        formattedMessage = `🙋‍♂️ *CLIENTE NECESITA ASISTENCIA - ${businessName}*\n\n` +
          `👤 *Cliente:* ${metadata?.customer_name || 'Cliente'}\n` +
          `📞 *Teléfono:* ${metadata?.customer_phone || 'No disponible'}\n` +
          `💬 *Mensaje:* ${message}\n\n` +
          `⏰ ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`;
        break;

      case 'urgent_support':
        formattedMessage = `🚨 *SOPORTE URGENTE - ${businessName}*\n\n` +
          `⚠️ *Situación:* ${message}\n` +
          `👤 *Cliente:* ${metadata?.customer_name || 'Cliente'}\n` +
          `📞 *Contacto:* ${metadata?.customer_phone || 'No disponible'}\n\n` +
          `⏰ ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`;
        break;

      default:
        formattedMessage = `📢 *NOTIFICACIÓN - ${businessName}*\n\n${message}\n\n` +
          `⏰ ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`;
    }

    // Check if user has Meta or Evolution WhatsApp
    const { data: metaCredentials } = await supabase
      .from('whatsapp_meta_credentials')
      .select('phone_number_id, access_token')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .maybeSingle();

    const { data: evolutionCredentials } = await supabase
      .from('whatsapp_evolution_credentials')
      .select('api_url, api_key, instance_name')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .maybeSingle();

    let whatsappResponse;

    if (metaCredentials?.phone_number_id && metaCredentials?.access_token) {
      // Use Meta WhatsApp API
      console.log('Sending via Meta WhatsApp API');
      
      const metaUrl = `https://graph.facebook.com/v21.0/${metaCredentials.phone_number_id}/messages`;
      const metaResponse = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaCredentials.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: profile.notification_phone.replace(/\D/g, ''),
          type: 'text',
          text: { body: formattedMessage }
        })
      });

      if (!metaResponse.ok) {
        const errorText = await metaResponse.text();
        console.error('Meta API error:', errorText);
        whatsappResponse = { error: errorText };
      } else {
        whatsappResponse = { data: await metaResponse.json() };
      }
    } else if (evolutionCredentials?.api_url && evolutionCredentials?.api_key) {
      // Use Evolution WhatsApp API
      console.log('Sending via Evolution WhatsApp API');
      
      const evolutionUrl = `${evolutionCredentials.api_url}/message/sendText/${evolutionCredentials.instance_name}`;
      const evolutionResponse = await fetch(evolutionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionCredentials.api_key,
        },
        body: JSON.stringify({
          number: profile.notification_phone.replace(/\D/g, ''),
          text: formattedMessage
        })
      });

      if (!evolutionResponse.ok) {
        const errorText = await evolutionResponse.text();
        console.error('Evolution API error:', errorText);
        whatsappResponse = { error: errorText };
      } else {
        whatsappResponse = { data: await evolutionResponse.json() };
      }
    } else {
      console.error('No active WhatsApp credentials found');
      return new Response(
        JSON.stringify({ 
          error: 'No active WhatsApp credentials found. Please configure WhatsApp in your settings.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (whatsappResponse.error) {
      console.error('Error sending WhatsApp notification:', whatsappResponse.error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send WhatsApp notification',
          details: whatsappResponse.error 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin notification sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notification sent successfully',
        notification_phone: profile.notification_phone
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-admin-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});