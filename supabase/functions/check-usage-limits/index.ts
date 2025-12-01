// @ts-nocheck
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error("Authentication error");
    const user = userData.user;
    if (!user?.id) throw new Error("User not found");

    // Obtener plan actual del usuario
    const { data: planData, error: planError } = await supabaseClient
      .rpc('get_user_current_plan', { target_user_id: user.id });

    if (planError) {
      console.error('Error getting user plan:', planError);
      throw new Error('Could not get user plan');
    }

    const currentPlan = planData?.[0];

    // Obtener uso actual del usuario
    const { data: usageData, error: usageError } = await supabaseClient
      .rpc('get_user_current_usage', { target_user_id: user.id });

    if (usageError) {
      console.error('Error getting user usage:', usageError);
      throw new Error('Could not get user usage');
    }

    const currentUsage = usageData?.[0];

    // Obtener el estado de bloqueo del profile
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('ai_messages_blocked')
      .eq('user_id', user.id)
      .single();

    // Obtener el saldo pendiente del contador de uso
    const { data: counterData } = await supabaseClient
      .from('usage_counters')
      .select('pending_charge_amount')
      .eq('user_id', user.id)
      .eq('year', new Date().getFullYear())
      .eq('month', new Date().getMonth() + 1)
      .single();

    const response = {
      plan_id: currentPlan?.plan_id || 'free',
      plan_name: currentPlan?.plan_name || 'Gratis',
      max_products: currentPlan?.max_products || 20,
      max_ai_messages: currentPlan?.max_ai_messages || 100,
      extra_message_cost: currentPlan?.extra_message_cost || null,
      subscription_status: currentPlan?.subscription_status || 'free',
      period_end: currentPlan?.period_end || null,
      
      ai_messages_used: currentUsage?.ai_messages_used || 0,
      extra_messages_purchased: currentUsage?.extra_messages_purchased || 0,
      products_count: currentUsage?.products_count || 0,
      
      ai_messages_blocked: profileData?.ai_messages_blocked || false,
      
      can_add_products: (currentUsage?.products_count || 0) < (currentPlan?.max_products || 20),
      can_send_ai_messages: !profileData?.ai_messages_blocked && (currentUsage?.ai_messages_used || 0) < ((currentPlan?.max_ai_messages || 100) + (currentUsage?.extra_messages_purchased || 0)),
      products_remaining: Math.max(0, (currentPlan?.max_products || 20) - (currentUsage?.products_count || 0)),
      ai_messages_remaining: Math.max(0, ((currentPlan?.max_ai_messages || 100) + (currentUsage?.extra_messages_purchased || 0)) - (currentUsage?.ai_messages_used || 0)),
      
      pending_charge_amount: counterData?.pending_charge_amount || 0
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error checking usage limits:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});