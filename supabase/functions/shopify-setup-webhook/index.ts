// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { shopDomain, accessToken } = await req.json()

    if (!shopDomain || !accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Decode the access token if it's base64 encoded (from database)
    let decodedToken = accessToken
    try {
      // Check if token is base64 encoded (stored tokens from DB)
      if (accessToken.includes('=') && !accessToken.startsWith('shpat_')) {
        decodedToken = atob(accessToken)
        console.log('Decoded access token for API call')
      }
    } catch (e) {
      // If decoding fails, use original token
      console.log('Using original access token')
    }

    // Get user from auth
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      )
    }

    // Get Supabase URL for webhooks
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    
    // Check if webhooks already exist
    console.log('🔍 Checking for existing webhooks...');
    const existingWebhooksResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/webhooks.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': decodedToken,
        'Content-Type': 'application/json',
      },
    });

    if (!existingWebhooksResponse.ok) {
      const errorText = await existingWebhooksResponse.text();
      console.error('❌ Error fetching existing webhooks:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch existing webhooks',
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existingWebhooks = await existingWebhooksResponse.json();
    console.log('📋 Existing webhooks found:', existingWebhooks.webhooks?.length || 0);

    // Webhook URLs
    const ordersWebhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook-orders`;
    const productsWebhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook-products`;
    
    // Check for existing webhooks
    const existingOrdersWebhook = existingWebhooks.webhooks?.find((webhook: any) => 
      webhook.address === ordersWebhookUrl && webhook.topic === 'orders/create'
    );
    const existingProductsCreateWebhook = existingWebhooks.webhooks?.find((webhook: any) => 
      webhook.address === productsWebhookUrl && webhook.topic === 'products/create'
    );
    const existingProductsUpdateWebhook = existingWebhooks.webhooks?.find((webhook: any) => 
      webhook.address === productsWebhookUrl && webhook.topic === 'products/update'
    );
    const existingProductsDeleteWebhook = existingWebhooks.webhooks?.find((webhook: any) => 
      webhook.address === productsWebhookUrl && webhook.topic === 'products/delete'
    );

    let ordersWebhookId = existingOrdersWebhook?.id;
    let productsWebhookId = existingProductsCreateWebhook?.id || existingProductsUpdateWebhook?.id || existingProductsDeleteWebhook?.id;

    // Create orders webhook if it doesn't exist
    if (!existingOrdersWebhook) {
      console.log('🔗 Creating orders webhook...');
      const ordersWebhookData = {
        webhook: {
          topic: 'orders/create',
          address: ordersWebhookUrl,
          format: 'json'
        }
      };

      const createOrdersWebhookResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': decodedToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ordersWebhookData),
      });

      if (createOrdersWebhookResponse.ok) {
        const newOrdersWebhook = await createOrdersWebhookResponse.json();
        ordersWebhookId = newOrdersWebhook.webhook?.id;
        console.log('✅ Orders webhook created:', ordersWebhookId);
      } else {
        const errorText = await createOrdersWebhookResponse.text();
        console.error('❌ Error creating orders webhook:', errorText);
      }
    } else {
      console.log('✅ Orders webhook already exists:', ordersWebhookId);
    }

    // Create products create webhook if it doesn't exist
    if (!existingProductsCreateWebhook) {
      console.log('🔗 Creating products create webhook...');
      const productsCreateWebhookData = {
        webhook: {
          topic: 'products/create',
          address: productsWebhookUrl,
          format: 'json'
        }
      };

      const createProductsCreateWebhookResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': decodedToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productsCreateWebhookData),
      });

      if (createProductsCreateWebhookResponse.ok) {
        const newProductsCreateWebhook = await createProductsCreateWebhookResponse.json();
        if (!productsWebhookId) productsWebhookId = newProductsCreateWebhook.webhook?.id;
        console.log('✅ Products create webhook created:', newProductsCreateWebhook.webhook?.id);
      } else {
        const errorText = await createProductsCreateWebhookResponse.text();
        console.error('❌ Error creating products create webhook:', errorText);
      }
    } else {
      console.log('✅ Products create webhook already exists');
    }

    // Create products update webhook if it doesn't exist
    if (!existingProductsUpdateWebhook) {
      console.log('🔗 Creating products update webhook...');
      const productsUpdateWebhookData = {
        webhook: {
          topic: 'products/update',
          address: productsWebhookUrl,
          format: 'json'
        }
      };

      const createProductsUpdateWebhookResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': decodedToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productsUpdateWebhookData),
      });

      if (createProductsUpdateWebhookResponse.ok) {
        const newProductsUpdateWebhook = await createProductsUpdateWebhookResponse.json();
        if (!productsWebhookId) productsWebhookId = newProductsUpdateWebhook.webhook?.id;
        console.log('✅ Products update webhook created:', newProductsUpdateWebhook.webhook?.id);
      } else {
        const errorText = await createProductsUpdateWebhookResponse.text();
        console.error('❌ Error creating products update webhook:', errorText);
      }
    } else {
      console.log('✅ Products update webhook already exists');
    }

    // Create products delete webhook if it doesn't exist
    if (!existingProductsDeleteWebhook) {
      console.log('🔗 Creating products delete webhook...');
      const productsDeleteWebhookData = {
        webhook: {
          topic: 'products/delete',
          address: productsWebhookUrl,
          format: 'json'
        }
      };

      const createProductsDeleteWebhookResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': decodedToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productsDeleteWebhookData),
      });

      if (createProductsDeleteWebhookResponse.ok) {
        const newProductsDeleteWebhook = await createProductsDeleteWebhookResponse.json();
        if (!productsWebhookId) productsWebhookId = newProductsDeleteWebhook.webhook?.id;
        console.log('✅ Products delete webhook created:', newProductsDeleteWebhook.webhook?.id);
      } else {
        const errorText = await createProductsDeleteWebhookResponse.text();
        console.error('❌ Error creating products delete webhook:', errorText);
      }
    } else {
      console.log('✅ Products delete webhook already exists');
    }

    // Update integration with webhook info
    const { error: updateError } = await supabaseClient
      .from('shopify_integrations')
      .update({ 
        connection_status: 'connected',
        webhook_configured: true,
        webhook_id_orders: ordersWebhookId?.toString(),
        webhook_id_products: productsWebhookId?.toString(),
        webhook_orders_url: ordersWebhookUrl,
        webhook_products_url: productsWebhookUrl,
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('shop_domain', shopDomain);

    if (updateError) {
      console.error('❌ Error updating integration:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhooks configured successfully',
      webhooks: {
        orders: ordersWebhookId,
        products: productsWebhookId
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error setting up webhook:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})