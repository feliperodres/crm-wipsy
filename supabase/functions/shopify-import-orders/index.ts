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
    const { shopDomain, accessToken, daysBack = 10, userId } = await req.json()

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

    // Calculate date from N days ago
    const now = new Date()
    const past = new Date()
    past.setDate(now.getDate() - daysBack)
    
    const createdAtMin = past.toISOString()
    const createdAtMax = now.toISOString()

    // Fetch orders from Shopify using the correct API version and format
    const shopifyUrl = `https://${shopDomain}/admin/api/2025-01/orders.json?status=any&created_at_min=${createdAtMin}&created_at_max=${createdAtMax}&limit=250`
    
    const response = await fetch(shopifyUrl, {
      headers: {
        'X-Shopify-Access-Token': decodedToken,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Shopify API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Shopify API error: ${response.status} ${response.statusText}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const data = await response.json()
    const orders = data.orders || []

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

    // Use provided userId (for admin operations) or authenticated user's id
    const targetUserId = userId || user.id
    console.log(`Importing orders for user: ${targetUserId}`)

    // Transform and save orders to our database
    for (const order of orders) {
      const orderData = {
        id: order.id.toString(),
        user_id: targetUserId,
        shop_domain: shopDomain,
        order_number: order.name || order.order_number?.toString(),
        email: order.email,
        created_at: order.created_at,
        updated_at: order.updated_at,
        total_price: parseFloat(order.total_price || '0'),
        subtotal_price: parseFloat(order.subtotal_price || '0'),
        total_tax: parseFloat(order.total_tax || '0'),
        currency: order.currency || 'USD',
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        customer_data: order.customer ? {
          id: order.customer.id,
          first_name: order.customer.first_name,
          last_name: order.customer.last_name,
          email: order.customer.email,
          phone: order.customer.phone
        } : null,
        line_items: order.line_items?.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          price: parseFloat(item.price || '0'),
          total_discount: parseFloat(item.total_discount || '0')
        })) || [],
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        raw_data: order
      }

      // Insert or update order
      const { error: insertError } = await supabaseClient
        .from('shopify_orders')
        .upsert(orderData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })

      if (insertError) {
        console.error('Error inserting order:', insertError)
        // Continue with other orders even if one fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: orders.length,
        message: `${orders.length} orders imported successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error importing orders:', error)
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