import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_URL = "https://n8n-n8n.uefo06.easypanel.host/webhook/4e3e2988-3ffe-475d-91ca-af3732698178";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Nota: usamos un payload flexible para tolerar variaciones en la forma (camelCase/snake_case)
// y para que la función nunca falle si faltan campos opcionales.

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: any = await req.json();
    console.log('Sending demo booking webhook (raw payload):', payload);

    // Resolver timeSlot desde distintas formas posibles
    let timeSlot: any = payload?.timeSlot ?? payload?.time_slot ?? payload?.booking?.time_slot ?? null;

    // Si no viene el timeSlot pero tenemos el ID, intentamos consultarlo en la BD
    if (!timeSlot && payload?.booking?.time_slot_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && supabaseServiceRoleKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
          const { data: slotData, error: slotError } = await supabase
            .from('demo_time_slots')
            .select('id, start_time, end_time, timezone')
            .eq('id', payload.booking.time_slot_id)
            .single();
          if (slotError) {
            console.error('Failed fetching time slot from DB:', slotError);
          } else {
            timeSlot = slotData;
          }
        } else {
          console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; skipping DB fetch for time slot.');
        }
      } catch (e) {
        console.error('Unexpected error fetching time slot:', e);
      }
    }

    // Normalizar questionnaire (puede venir en distintos lugares)
    const questionnaire: any =
      payload?.questionnaire ??
      payload?.booking?.questionnaire_response ??
      payload?.questionnaire_response ??
      {};

    // Preparar los datos para el webhook (con checks defensivos)
    const webhookData = {
      // Información de la reserva
      booking_id: payload?.booking?.id ?? null,
      booking_status: payload?.booking?.status ?? null,
      booking_created_at: payload?.booking?.created_at ?? null,
      booking_notes: payload?.booking?.notes ?? '',

      // Información del horario
      time_slot_id: payload?.booking?.time_slot_id ?? timeSlot?.id ?? null,
      meeting_start_time: timeSlot?.start_time ?? null,
      meeting_end_time: timeSlot?.end_time ?? null,
      meeting_timezone: timeSlot?.timezone ?? null,

      // Información del cliente/empresa
      company_name: questionnaire?.company_name ?? null,
      contact_name: questionnaire?.contact_name ?? null,
      contact_email: questionnaire?.contact_email ?? null,
      contact_phone: questionnaire?.contact_phone ?? null,

      // Información del negocio
      product_type: questionnaire?.product_type ?? null,
      product_count: questionnaire?.product_count ?? null,
      messages_per_month: questionnaire?.messages_per_month ?? null,
      monthly_sales: questionnaire?.monthly_sales ?? null,
      platform: questionnaire?.platform ?? null,

      // Metadata adicional
      questionnaire_created_at: questionnaire?.created_at ?? null,
      questionnaire_id: questionnaire?.id ?? null,
    };

    console.log('Prepared webhook data:', webhookData);

    // Enviar al webhook de n8n
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
    }

    const webhookResult = await webhookResponse.text();
    console.log('Webhook sent successfully:', webhookResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook sent successfully',
        webhookResponse: webhookResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in send-demo-booking-webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message ?? String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
