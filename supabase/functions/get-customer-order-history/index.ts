import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get customer_id from URL params
    const url = new URL(req.url);
    const customerId = url.searchParams.get('customer_id');

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customer_id parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching order history for customer:', customerId);

    // First verify the customer exists and get basic info
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, phone, user_id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get local orders - only essential data
    const { data: localOrders, error: localOrdersError } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        status,
        created_at,
        order_items (
          quantity,
          products (
            name
          )
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5); // Solo los últimos 5 pedidos

    if (localOrdersError) {
      console.error('Error fetching local orders:', localOrdersError);
    }

    // Get Shopify orders - only essential data
    const { data: shopifyOrders, error: shopifyOrdersError } = await supabase
      .from('shopify_orders')
      .select(`
        id,
        order_number,
        total_price,
        financial_status,
        created_at,
        line_items
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5); // Solo los últimos 5 pedidos

    if (shopifyOrdersError) {
      console.error('Error fetching Shopify orders:', shopifyOrdersError);
    }

    // Get total counts for summary (without fetching all data)
    const { count: totalLocalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    const { count: totalShopifyOrders } = await supabase
      .from('shopify_orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    // Calculate total spent from recent orders shown
    const totalSpentRecent = [
      ...(localOrders || []).map(order => Number(order.total || 0)),
      ...(shopifyOrders || []).map(order => Number(order.total_price || 0))
    ].reduce((sum, amount) => sum + amount, 0);

    // Extract most bought products from recent orders
    const recentProducts: string[] = [];
    localOrders?.forEach(order => {
      order.order_items?.forEach(item => {
        if ((item.products as any)?.name) {
          recentProducts.push(`${(item.products as any).name} (x${item.quantity})`);
        }
      });
    });

    shopifyOrders?.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach((item: any) => {
          if (item.title) {
            recentProducts.push(`${item.title} (x${item.quantity})`);
          }
        });
      }
    });

    // Format the simplified response
    const response = {
      success: true,
      customer: {
        name: customer.name,
        phone: customer.phone
      },
      summary: {
        total_orders: (totalLocalOrders || 0) + (totalShopifyOrders || 0),
        recent_orders_shown: (localOrders?.length || 0) + (shopifyOrders?.length || 0),
        total_spent_recent: totalSpentRecent,
        recent_products: recentProducts.slice(0, 10), // Solo top 10 productos recientes
        last_order_date: [
          ...(localOrders || []).map(order => order.created_at),
          ...(shopifyOrders || []).map(order => order.created_at)
        ].sort().reverse()[0] || null
      },
      recent_orders: [
        ...(localOrders || []).map(order => ({
          id: order.id,
          total: order.total,
          status: order.status,
          date: order.created_at,
          source: 'local'
        })),
        ...(shopifyOrders || []).map(order => ({
          id: order.id,
          number: order.order_number,
          total: order.total_price,
          status: order.financial_status,
          date: order.created_at,
          source: 'shopify'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };

    console.log('Order history fetched successfully:', {
      customer_id: customerId,
      total_orders: response.summary.total_orders,
      recent_orders_shown: response.summary.recent_orders_shown
    });

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in get-customer-order-history:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});