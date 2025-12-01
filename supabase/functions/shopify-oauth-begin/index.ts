import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Get shop domain from body (POST) or query params (GET)
    let shop: string | null = null;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        shop = body.shop || null;
      } catch (e) {
        console.log('No JSON body or invalid JSON');
      }
    }
    
    // Fallback to query params if not in body
    if (!shop) {
      shop = url.searchParams.get('shop');
    }

    if (!shop) {
      return new Response(
        JSON.stringify({ error: 'Missing shop parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate shop domain format
    if (!shop.endsWith('.myshopify.com')) {
      return new Response(
        JSON.stringify({ error: 'Invalid shop domain. Must be a .myshopify.com domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in database with expiration
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        user_id: user.id,
        state: state,
        shop_domain: shop,
      });

    if (stateError) {
      console.error('Error storing state:', stateError);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize OAuth flow' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Shopify app credentials
    const apiKey = Deno.env.get('SHOPIFY_API_KEY');
    const scopes = Deno.env.get('SHOPIFY_APP_SCOPES') || 'read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_customers,write_customers';
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/shopify-oauth-callback`;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Shopify API Key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Shopify OAuth URL
    const shopifyAuthUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    shopifyAuthUrl.searchParams.set('client_id', apiKey);
    shopifyAuthUrl.searchParams.set('scope', scopes);
    shopifyAuthUrl.searchParams.set('redirect_uri', redirectUri);
    shopifyAuthUrl.searchParams.set('state', state);

    console.log('OAuth URL generated:', shopifyAuthUrl.toString());

    // Return OAuth URL as JSON (popup will open this URL)
    return new Response(
      JSON.stringify({ url: shopifyAuthUrl.toString() }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in shopify-oauth-begin:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
