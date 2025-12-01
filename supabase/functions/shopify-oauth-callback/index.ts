import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

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
    const code = url.searchParams.get('code');
    const shop = url.searchParams.get('shop');
    const state = url.searchParams.get('state');
    const hmac = url.searchParams.get('hmac');

    // Validate required parameters
    if (!code || !shop || !state) {
      console.error('Missing required parameters:', { code: !!code, shop: !!shop, state: !!state });
      return redirectToIntegrations('error', 'Missing required OAuth parameters');
    }

    // Initialize Supabase with service role key for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify state to prevent CSRF
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .single();

    if (stateError || !stateData) {
      console.error('Invalid or expired state:', stateError);
      return redirectToIntegrations('error', 'Invalid or expired OAuth state');
    }

    // Verify state hasn't expired
    if (new Date(stateData.expires_at) < new Date()) {
      console.error('State expired');
      await supabase.from('oauth_states').delete().eq('state', state);
      return redirectToIntegrations('error', 'OAuth state expired');
    }

    // Verify shop domain matches
    if (stateData.shop_domain !== shop) {
      console.error('Shop domain mismatch');
      return redirectToIntegrations('error', 'Shop domain mismatch');
    }

    // Validate HMAC (Shopify signature verification)
    const apiSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!apiSecret) {
      console.error('SHOPIFY_API_SECRET not configured');
      return redirectToIntegrations('error', 'Server configuration error');
    }

    // Build query string for HMAC validation (exclude hmac and signature params)
    const queryParams = new URLSearchParams(url.search);
    queryParams.delete('hmac');
    queryParams.delete('signature');
    const sortedParams = Array.from(queryParams.entries()).sort();
    const queryString = sortedParams.map(([key, value]) => `${key}=${value}`).join('&');

    // Calculate expected HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const messageData = encoder.encode(queryString);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedHmac = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (hmac !== expectedHmac) {
      console.error('HMAC validation failed');
      return redirectToIntegrations('error', 'Invalid request signature');
    }

    // Exchange code for access token
    const apiKey = Deno.env.get('SHOPIFY_API_KEY');
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for token:', errorText);
      return redirectToIntegrations('error', 'Failed to obtain access token from Shopify');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access token in response');
      return redirectToIntegrations('error', 'No access token received');
    }

    // Test the access token by fetching shop info
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopInfoResponse.ok) {
      console.error('Failed to verify access token');
      return redirectToIntegrations('error', 'Failed to verify Shopify credentials');
    }

    const shopInfo = await shopInfoResponse.json();

    // Encrypt access token (basic encryption with btoa)
    const encryptedToken = btoa(accessToken);

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('shopify_integrations')
      .select('id')
      .eq('user_id', stateData.user_id)
      .eq('shop_domain', shop)
      .single();

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('shopify_integrations')
        .update({
          access_token_encrypted: encryptedToken,
          connection_status: 'connected',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingIntegration.id);

      if (updateError) {
        console.error('Error updating integration:', updateError);
        return redirectToIntegrations('error', 'Failed to update integration');
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('shopify_integrations')
        .insert({
          user_id: stateData.user_id,
          shop_domain: shop,
          access_token_encrypted: encryptedToken,
          connection_status: 'connected',
          is_active: true,
        });

      if (insertError) {
        console.error('Error creating integration:', insertError);
        return redirectToIntegrations('error', 'Failed to create integration');
      }
    }

    // Clean up state
    await supabase.from('oauth_states').delete().eq('state', state);

    // Setup webhooks automatically
    try {
      const { data: integration } = await supabase
        .from('shopify_integrations')
        .select('id')
        .eq('user_id', stateData.user_id)
        .eq('shop_domain', shop)
        .single();

      if (integration) {
        // Call the webhook setup function
        await supabase.functions.invoke('shopify-setup-webhook', {
          body: {
            integrationId: integration.id,
            userId: stateData.user_id,
          },
        });
      }
    } catch (webhookError) {
      console.error('Error setting up webhooks:', webhookError);
      // Don't fail the OAuth flow if webhooks fail - they can be set up later
    }

    console.log('OAuth flow completed successfully for shop:', shop);

    // Redirect back to integrations page with success
    return redirectToIntegrations('success', 'Shopify connected successfully');

  } catch (error) {
    console.error('Error in shopify-oauth-callback:', error);
    return redirectToIntegrations('error', 'An unexpected error occurred');
  }
});

function redirectToIntegrations(status: string, message: string) {
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('https://fczgowziugcvrpgfelks.supabase.co', 'https://wipsy.lovable.app') || 'https://wipsy.lovable.app';
  const redirectUrl = `${baseUrl}/integrations?oauth_status=${status}&oauth_message=${encodeURIComponent(message)}`;
  
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Shopify OAuth</title>
        <script>
          window.opener?.postMessage({ type: 'shopify-oauth', status: '${status}', message: '${message}' }, '*');
          setTimeout(() => window.close(), 1000);
        </script>
      </head>
      <body>
        <p>${message}. Cerrando ventana...</p>
      </body>
    </html>`,
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    }
  );
}
