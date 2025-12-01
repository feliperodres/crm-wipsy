import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { user_id, chat_id, message_content, tokens_used = 1, cost_amount = 0.001 } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Increment AI message usage (ahora retorna información sobre cobros)
    const { data, error } = await supabaseClient.rpc('increment_ai_message_usage', {
      target_user_id: user_id,
      tokens_used: tokens_used,
      cost_amount: cost_amount,
      chat_id_param: chat_id,
      message_content_param: message_content
    });

    if (error) {
      console.error('Error incrementing AI usage:', error);
      throw error;
    }

    console.log('AI usage incremented successfully for user:', user_id, data);

    // Si se debe cobrar, invocar la función de cobro
    if (data && data.should_charge) {
      console.log(`Triggering charge for user ${user_id}, pending amount: $${data.pending_amount}`);
      
      try {
        // Invocar función de cobro de forma asíncrona (no bloquear la respuesta)
        supabaseClient.functions.invoke('charge-extra-messages', {
          body: {
            user_id: user_id,
            charge_amount: data.charge_amount
          }
        }).then(({ data: chargeData, error: chargeError }) => {
          if (chargeError) {
            console.error('Error charging extra messages:', chargeError);
          } else {
            console.log('Extra messages charge initiated:', chargeData);
          }
        });
      } catch (chargeError) {
        console.error('Failed to initiate charge:', chargeError);
        // No lanzar error aquí para no bloquear el flujo principal
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data,
      charge_initiated: data?.should_charge || false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error incrementing AI usage:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});