import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to map Shopify status to our internal status
function mapShopifyStatus(financialStatus: string, fulfillmentStatus: string): string {
  // Priority order: fulfillment status first, then financial status
  if (fulfillmentStatus) {
    switch (fulfillmentStatus) {
      case 'fulfilled':
        return 'delivered';
      case 'partial':
        return 'preparing';
      case 'unfulfilled':
      case null:
        // Check financial status for unfulfilled orders
        if (financialStatus === 'paid') {
          return 'confirmed';
        }
        return 'pending';
      default:
        return 'pending';
    }
  }
  
  // Fallback to financial status
  switch (financialStatus) {
    case 'paid':
      return 'confirmed';
    case 'pending':
      return 'pending';
    case 'refunded':
    case 'voided':
      return 'cancelled';
    default:
      return 'pending';
  }
}

serve(async (req) => {
  console.log('📦 Shopify Orders Webhook - Received request:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error('❌ Invalid method:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get Shopify headers
    const shopifyTopic = req.headers.get('x-shopify-topic');
    const shopifyShop = req.headers.get('x-shopify-shop-domain');
    const shopifyHmac = req.headers.get('x-shopify-hmac-sha256');

    console.log('🏪 Shopify headers:', { shopifyTopic, shopifyShop, shopifyHmac });

    if (!shopifyTopic || !shopifyShop) {
      console.error('❌ Missing required Shopify headers');
      return new Response(JSON.stringify({ error: 'Missing Shopify headers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only process order creation events
    if (shopifyTopic !== 'orders/create') {
      console.log('🔄 Ignoring non-order creation event:', shopifyTopic);
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderData = await req.json();
    console.log('📋 Received order data:', JSON.stringify(orderData, null, 2));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Find the user for this shop
    const { data: integration, error: integrationError } = await supabase
      .from('shopify_integrations')
      .select('user_id')
      .eq('shop_domain', shopifyShop)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('❌ Integration not found for shop:', shopifyShop, integrationError);
      return new Response(JSON.stringify({ error: 'Integration not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('👤 Found user for integration:', integration.user_id);

    // Check if customer exists, create if not
    let customerId;
    if (orderData.customer) {
      const customerPhone = orderData.customer.phone || orderData.billing_address?.phone || null;
      const customerEmail = orderData.customer.email;
      const customerName = `${orderData.customer.first_name || ''} ${orderData.customer.last_name || ''}`.trim() || 'Cliente Shopify';

      // Look for existing customer by email first, then by phone if no email
      let existingCustomer = null;
      
      if (customerEmail) {
        const { data } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', integration.user_id)
          .eq('email', customerEmail)
          .maybeSingle();
        existingCustomer = data;
      }
      
      // If no customer found by email and we have a phone, try by phone
      if (!existingCustomer && customerPhone) {
        const { data } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', integration.user_id)
          .eq('phone', customerPhone)
          .maybeSingle();
        existingCustomer = data;
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('👥 Using existing customer:', customerId);
      } else {
        // Generate unique phone if none provided
        const finalPhone = customerPhone || `shopify-${orderData.id}-${Date.now()}`;
        
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            user_id: integration.user_id,
            name: customerName,
            email: customerEmail,
            phone: finalPhone,
            address: orderData.billing_address ? 
              `${orderData.billing_address.address1 || ''} ${orderData.billing_address.city || ''} ${orderData.billing_address.province || ''}`.trim() 
              : null,
          })
          .select('id')
          .single();

        if (customerError) {
          console.error('❌ Error creating customer:', customerError);
          return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        customerId = newCustomer.id;
        console.log('👥 Created new customer:', customerId);
      }
    } else {
      // For orders without customer data, generate unique identifier
      const uniquePhone = `shopify-guest-${orderData.id}-${Date.now()}`;
      
      const { data: defaultCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          user_id: integration.user_id,
          name: 'Cliente Shopify',
          email: orderData.email || `guest-${orderData.id}@shopify.com`,
          phone: uniquePhone,
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('❌ Error creating default customer:', customerError);
        return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      customerId = defaultCustomer.id;
      console.log('👥 Created default customer:', customerId);
    }

    // Create the order record in shopify_orders table
    const orderStatus = mapShopifyStatus(orderData.financial_status, orderData.fulfillment_status);
    
    const { data: order, error: orderError } = await supabase
      .from('shopify_orders')
      .insert({
        id: orderData.id.toString(),
        user_id: integration.user_id,
        customer_id: customerId,  // Link to the customer we just created/found
        shop_domain: shopifyShop,
        order_number: orderData.name || orderData.order_number?.toString(),
        email: orderData.email,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
        total_price: parseFloat(orderData.total_price || '0'),
        subtotal_price: parseFloat(orderData.subtotal_price || '0'),
        total_tax: parseFloat(orderData.total_tax || '0'),
        currency: orderData.currency || 'COP',
        financial_status: orderData.financial_status,
        fulfillment_status: orderData.fulfillment_status,
        customer_data: orderData.customer ? {
          id: orderData.customer.id,
          first_name: orderData.customer.first_name,
          last_name: orderData.customer.last_name,
          email: orderData.customer.email,
          phone: orderData.customer.phone
        } : null,
        line_items: orderData.line_items?.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          price: parseFloat(item.price || '0'),
          total_discount: parseFloat(item.total_discount || '0')
        })) || [],
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        raw_data: orderData
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('❌ Error creating Shopify order:', orderError);
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📦 Created Shopify order:', order.id);

    console.log('✅ Successfully processed Shopify order webhook');

    return new Response(JSON.stringify({ 
      success: true, 
      orderId: order.id,
      message: 'Order processed successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});