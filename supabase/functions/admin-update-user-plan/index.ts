import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    // Verificar que el usuario que hace la petición es admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: adminData, error: adminError } = await supabaseClient.auth.getUser(token);
    if (adminError || !adminData?.user) throw new Error("Authentication error");

    const adminEmail = adminData.user.email;
    const adminEmails = ['felipe.rodres@gmail.com', 'admin@wipsy.com'];
    
    if (!adminEmail || !adminEmails.includes(adminEmail)) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { target_user_id, new_plan_id } = await req.json();

    if (!target_user_id || !new_plan_id) {
      throw new Error("target_user_id and new_plan_id are required");
    }

    console.log(`Admin ${adminEmail} changing plan for user ${target_user_id} to ${new_plan_id}`);

    // Obtener información del usuario objetivo
    const { data: targetUser, error: userError } = await supabaseClient.auth.admin.getUserById(target_user_id);
    
    if (userError || !targetUser?.user?.email) {
      throw new Error("Target user not found");
    }

    const userEmail = targetUser.user.email;

    // Obtener el plan nuevo
    const { data: planData, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('plan_id', new_plan_id)
      .single();

    if (planError || !planData) {
      throw new Error("Plan not found");
    }

    // Si es plan gratis, eliminar la suscripción
    if (new_plan_id === 'free') {
      const { error: deleteError } = await supabaseClient
        .from('user_subscriptions')
        .delete()
        .eq('user_id', target_user_id);

      if (deleteError) {
        console.error('Error deleting subscription:', deleteError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Usuario cambiado a plan gratuito`,
        user_email: userEmail,
        new_plan: planData.name
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Para planes pagos, crear/actualizar suscripción
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Buscar o crear cliente en Stripe
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({ email: userEmail });
      customerId = newCustomer.id;
    }

    // Actualizar o crear suscripción en la base de datos
    const subscriptionData = {
      user_id: target_user_id,
      plan_id: new_plan_id,
      status: 'active',
      stripe_customer_id: customerId,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabaseClient
      .from('user_subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error upserting subscription:', upsertError);
      throw upsertError;
    }

    console.log(`Successfully changed plan for user ${userEmail} to ${planData.name}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Plan actualizado exitosamente`,
      user_email: userEmail,
      new_plan: planData.name,
      customer_id: customerId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error updating user plan:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
