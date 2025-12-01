import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopDomain, accessToken, userId } = await req.json();

    if (!shopDomain || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Shop domain and access token are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Basic validation
    if (!shopDomain.includes('.myshopify.com')) {
      return new Response(
        JSON.stringify({ error: 'Shop domain must include .myshopify.com' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!accessToken.startsWith('shpat_')) {
      return new Response(
        JSON.stringify({ error: 'Access token must start with shpat_' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate credentials by making a test API call to Shopify
    const shopifyUrl = `https://${shopDomain}/admin/api/2023-10/shop.json`;
    
    console.log(`Testing connection to: ${shopifyUrl}`);

    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      console.error('Shopify API error:', shopifyResponse.status, await shopifyResponse.text());
      
      if (shopifyResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Credenciales inválidas. Verifica tu access token.',
            success: false 
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (shopifyResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'Tienda no encontrada. Verifica el dominio de tu tienda.',
            success: false 
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'Error al conectar con Shopify. Verifica tus credenciales.',
          success: false 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const shopData = await shopifyResponse.json();
    console.log('Shopify connection successful:', shopData.shop?.name || 'Unknown shop');

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user from JWT (or use provided userId for admin operations)
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use provided userId (for admin operations) or authenticated user's id
    const targetUserId = userId || user.id;
    console.log(`Setting up Shopify integration for user: ${targetUserId}`);

    // Simple encryption for demo (in production, use proper encryption)
    const encryptedToken = btoa(accessToken);

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('shopify_integrations')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('shop_domain', shopDomain)
      .maybeSingle();

    let integration;
    let dbError;

    if (existingIntegration) {
      // Update existing integration
      const result = await supabase
        .from('shopify_integrations')
        .update({
          access_token_encrypted: encryptedToken,
          connection_status: 'connected',
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', existingIntegration.id)
        .select()
        .single();
      
      integration = result.data;
      dbError = result.error;
    } else {
      // Insert new integration
      const result = await supabase
        .from('shopify_integrations')
        .insert({
          user_id: targetUserId,
          shop_domain: shopDomain,
          access_token_encrypted: encryptedToken,
          connection_status: 'connected',
          last_sync_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      integration = result.data;
      dbError = result.error;
    }

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Mensaje de error más específico
      let errorMessage = 'Error saving integration';
      if (dbError.code === '23505') {
        errorMessage = 'Esta tienda ya está conectada. Si deseas reconectar, contacta al soporte.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          success: false 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        shop: {
          name: shopData.shop?.name || shopDomain,
          domain: shopDomain,
          email: shopData.shop?.email,
        },
        integration_id: integration.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});