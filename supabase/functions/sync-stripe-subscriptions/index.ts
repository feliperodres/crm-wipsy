import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting subscription sync");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Obtener todos los usuarios
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    logStep(`Found ${users.users.length} users to check`);

    let syncedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const user of users.users) {
      if (!user.email) {
        skippedCount++;
        continue;
      }

      try {
        // Buscar cliente en Stripe
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        
        if (customers.data.length === 0) {
          skippedCount++;
          continue;
        }

        const customerId = customers.data[0].id;

        // Buscar suscripciones activas
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });

        if (subscriptions.data.length === 0) {
          skippedCount++;
          continue;
        }

        const subscription = subscriptions.data[0];
        const priceId = subscription.items.data[0].price.id;
        const productId = subscription.items.data[0].price.product;

        // Obtener plan de la base de datos
        const { data: planData } = await supabaseAdmin
          .from('subscription_plans')
          .select('plan_id, name')
          .eq('stripe_price_id', priceId)
          .single();

        const planId = planData?.plan_id || 'free';
        const periodEnd = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        const periodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null;

        // Guardar en la base de datos
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
          logStep("Error upserting subscription", { userId: user.id, error: upsertError });
          results.push({
            email: user.email,
            status: 'error',
            error: upsertError.message
          });
        } else {
          syncedCount++;
          results.push({
            email: user.email,
            status: 'synced',
            plan: planId,
            subscriptionId: subscription.id
          });
          logStep("Synced subscription", { email: user.email, plan: planId });
        }

      } catch (error) {
        logStep("Error processing user", { email: user.email, error: error instanceof Error ? error.message : String(error) });
        results.push({
          email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logStep("Sync completed", { syncedCount, skippedCount, totalUsers: users.users.length });

    return new Response(JSON.stringify({
      success: true,
      totalUsers: users.users.length,
      syncedCount,
      skippedCount,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
