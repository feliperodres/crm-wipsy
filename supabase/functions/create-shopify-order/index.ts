import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, user_id } = await req.json();

    console.log('Creating Shopify order for:', { order_id, user_id });

    // Check if Shopify integration exists and is active
    const { data: integration, error: integrationError } = await supabase
      .from('shopify_integrations')
      .select('shop_domain, access_token_encrypted, is_active')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (integrationError || !integration) {
      console.log('No active Shopify integration found');
      return new Response(
        JSON.stringify({ success: false, message: 'No active Shopify integration' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode access token
    let accessToken = integration.access_token_encrypted;
    try {
      accessToken = atob(accessToken);
    } catch (e) {
      console.log('Access token not base64 encoded, using as is');
    }

    // Get order details with customer and items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        items:order_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to sanitize phone to E.164 (defaults to +57 if no country code)
    const sanitizePhone = (raw?: string) => {
      if (!raw) return undefined;
      let p = String(raw).trim().replace(/[^0-9+]/g, '');
      if (p.startsWith('00')) p = '+' + p.slice(2);
      if (!p.startsWith('+')) {
        if (p.startsWith('57')) p = '+' + p;
        else p = '+57' + p;
      }
      const digits = p.replace(/[^0-9]/g, '');
      if (digits.length < 10 || digits.length > 15) return undefined;
      return p;
    };

    // Ensure we have order items (with small retry to avoid replica lag)
    let itemsSource = order.items || [];

    const fetchFallbackItems = async () => {
      const { data: fallbackItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*, product:products(*)')
        .eq('order_id', order_id);
      if (itemsError) {
        console.error('Error fetching order items fallback:', itemsError);
      }
      return fallbackItems || [];
    };

    if (!itemsSource || itemsSource.length === 0) {
      console.log('No embedded items found, trying fallback with retries...');
      let attempts = 0;
      while ((!itemsSource || itemsSource.length === 0) && attempts < 5) {
        if (attempts > 0) {
          await new Promise((r) => setTimeout(r, 300));
        }
        itemsSource = await fetchFallbackItems();
        console.log(`Fallback items attempt ${attempts + 1}: count=${itemsSource.length}`);
        attempts++;
      }
    }

    if (!itemsSource || itemsSource.length === 0) {
      console.error('No line items found for order, cannot create Shopify order');
      return new Response(
        JSON.stringify({ error: 'No line items found for order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Shopify order payload
    const lineItems = itemsSource.map((item: any) => {
      const lineItem: any = {
        title: item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.price?.toString?.() || String(item.price || '0'),
      };

      // If product has shopify_id, use it as variant_id
      if (item.product?.shopify_id) {
        lineItem.variant_id = item.product.shopify_id;
      }

      return lineItem;
    });

    // Build customer data
    const formattedPhone = sanitizePhone(order.customer?.phone);
    const customerData: any = {
      first_name: order.customer?.name || 'Cliente',
      last_name: order.customer?.last_name || '',
      ...(order.customer?.email ? { email: order.customer.email } : {}),
      ...(formattedPhone ? { phone: formattedPhone } : {}),
    };

    // Build shipping address
    const shippingAddress: any = {
      first_name: order.customer?.name || 'Cliente',
      last_name: order.customer?.last_name || '',
      address1: order.customer?.address || '',
      city: order.customer?.city || '',
      province: order.customer?.province || '',
      country: 'CO', // Default to Colombia
      ...(formattedPhone ? { phone: formattedPhone } : {}),
    };

    // Create Shopify order directly
    const shopifyPayload = {
      order: {
        line_items: lineItems,
        customer: customerData,
        shipping_address: shippingAddress,
        billing_address: shippingAddress,
        email: order.customer?.email || undefined,
        phone: formattedPhone,
        note: order.notes || `Pedido creado desde Wipsy - ID: ${order_id}`,
        tags: 'wipsy',
        shipping_lines: [{
          title: 'Envío',
          price: (order.shipping_cost || 0).toString(),
        }],
        financial_status: 'pending',
        send_receipt: false,
        send_fulfillment_receipt: false,
      }
    };

    console.log('Creating Shopify order:', JSON.stringify(shopifyPayload, null, 2));

    // Create order in Shopify
    const shopifyResponse = await fetch(
      `https://${integration.shop_domain}/admin/api/2025-01/orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify(shopifyPayload),
      }
    );

    const responseText = await shopifyResponse.text();
    console.log('Shopify response status:', shopifyResponse.status);
    console.log('Shopify response:', responseText);

    if (!shopifyResponse.ok) {
      console.error('Shopify API error:', responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create Shopify order',
          details: responseText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopifyData = JSON.parse(responseText);
    const shopifyOrder = shopifyData.order;

    console.log('Shopify order created:', shopifyOrder.id, 'Order number:', shopifyOrder.order_number);

    // Update local order with Shopify reference
    await supabase
      .from('orders')
      .update({ 
        notes: `${order.notes || ''}\nShopify Order: #${shopifyOrder.order_number} (ID: ${shopifyOrder.id})`.trim()
      })
      .eq('id', order_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        shopify_order_id: shopifyOrder.id,
        shopify_order_number: shopifyOrder.order_number,
        shopify_order_url: `https://${integration.shop_domain}/admin/orders/${shopifyOrder.id}`,
        message: 'Order created in Shopify successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-shopify-order function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
