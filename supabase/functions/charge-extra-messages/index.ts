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
    const { user_id, charge_amount = 5.00 } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    console.log(`Processing charge for user ${user_id}, amount: $${charge_amount}`);

    // Obtener información del usuario
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', user_id)
      .single();

    if (userError || !userData) {
      throw new Error("User not found");
    }

    // Obtener el email del usuario desde auth.users
    const { data: authData, error: authError } = await supabaseClient.auth.admin.getUserById(user_id);
    
    if (authError || !authData?.user?.email) {
      throw new Error("User email not found");
    }

    const userEmail = authData.user.email;

    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Buscar o crear cliente en Stripe
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`Found existing Stripe customer: ${customerId}`);
    } else {
      const newCustomer = await stripe.customers.create({ email: userEmail });
      customerId = newCustomer.id;
      console.log(`Created new Stripe customer: ${customerId}`);
    }

    // Crear el cargo por mensajes adicionales
    const charge = await stripe.charges.create({
      amount: Math.round(charge_amount * 100), // Convertir a centavos
      currency: "usd",
      customer: customerId,
      description: `Mensajes IA adicionales - $${charge_amount}`,
      metadata: {
        user_id: user_id,
        type: "extra_ai_messages"
      }
    });

    console.log(`Charge created successfully: ${charge.id}`);

    // Si el cargo fue exitoso, actualizar la base de datos
    if (charge.status === "succeeded") {
      const { error: processError } = await supabaseClient.rpc(
        'process_extra_messages_charge',
        {
          target_user_id: user_id,
          charge_amount: charge_amount
        }
      );

      if (processError) {
        console.error("Error processing charge in database:", processError);
        throw processError;
      }

      console.log(`Successfully processed charge and updated usage counters`);

      return new Response(JSON.stringify({
        success: true,
        charge_id: charge.id,
        amount: charge_amount,
        message: "Cargo procesado exitosamente"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error(`Charge failed with status: ${charge.status}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error charging extra messages:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
