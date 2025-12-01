import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning free plan data");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_id: 'free',
        plan_name: 'Gratis'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let planId = 'free';
    let planName = 'Gratis';
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      
      // Validar que current_period_end existe antes de convertir
      const periodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      
      const periodStart = subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null;
        
      subscriptionEnd = periodEnd;
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      productId = subscription.items.data[0].price.product;
      const priceId = subscription.items.data[0].price.id;
      
      // Map price_id to plan_id using our database
      const { data: planData } = await supabaseClient
        .from('subscription_plans')
        .select('plan_id, name')
        .eq('stripe_price_id', priceId)
        .single();
        
      if (planData) {
        planId = planData.plan_id;
        planName = planData.name;
      }
      
      logStep("Determined subscription details", { productId, planId, planName });
      
      // Guardar suscripción en la base de datos usando SERVICE_ROLE_KEY
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { error: upsertError } = await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          plan_id: planId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          status: 'active',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
        
      if (upsertError) {
        logStep("Error saving subscription to database", { error: upsertError });
      } else {
        logStep("Subscription saved to database successfully");
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_id: planId,
      plan_name: planName,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});