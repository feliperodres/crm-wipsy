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
    const { productId } = await req.json()

    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing productId' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
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

    // Get the product with its Shopify ID
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (productError || !product) {
      console.error('Product not found:', productError)
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Check if product has Shopify ID (was imported from Shopify)
    if (!product.shopify_id) {
      console.log('Product does not have Shopify ID, skipping sync')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Product not linked to Shopify, no sync needed',
          synced: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Shopify integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('shopify_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      console.error('Shopify integration not found:', integrationError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Shopify integration not configured',
          synced: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Decode the access token
    let decodedToken = integration.access_token_encrypted
    try {
      if (decodedToken.includes('=') && !decodedToken.startsWith('shpat_')) {
        decodedToken = atob(decodedToken)
      }
    } catch (e) {
      console.log('Using original access token')
    }

    // Get product variants
    const { data: variants } = await supabaseClient
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('user_id', user.id)

    console.log(`Found ${variants?.length || 0} variants for product ${productId}`)

    // Update product in Shopify
    const shopifyProductData = {
      product: {
        title: product.name,
        body_html: product.description,
        product_type: product.product_type,
        vendor: product.vendor,
        tags: product.tags?.join(', '),
        status: product.is_active ? 'active' : 'draft'
      }
    }

    console.log('Updating Shopify product:', product.shopify_id, shopifyProductData)

    const response = await fetch(
      `https://${integration.shop_domain}/admin/api/2025-01/products/${product.shopify_id}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': decodedToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shopifyProductData)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Shopify API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Shopify product update failed: ${response.status}`,
          synced: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    const updatedProduct = await response.json()
    console.log('✅ Shopify product updated successfully')

    // Now update each variant individually
    let variantsUpdated = 0
    let variantErrors = []

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        if (!variant.shopify_id) {
          console.warn(`Variant ${variant.id} has no shopify_id, skipping`)
          continue
        }

        try {
          const variantData = {
            variant: {
              price: variant.price.toString(),
              inventory_quantity: variant.inventory_quantity,
              sku: variant.sku,
              barcode: variant.barcode,
              weight: variant.weight,
              weight_unit: variant.weight_unit,
              compare_at_price: variant.compare_at_price?.toString() || null
            }
          }

          console.log(`Updating variant ${variant.shopify_id}:`, variantData)

          const variantResponse = await fetch(
            `https://${integration.shop_domain}/admin/api/2025-01/variants/${variant.shopify_id}.json`,
            {
              method: 'PUT',
              headers: {
                'X-Shopify-Access-Token': decodedToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(variantData)
            }
          )

          if (!variantResponse.ok) {
            const errorText = await variantResponse.text()
            console.error(`Error updating variant ${variant.shopify_id}:`, variantResponse.status, errorText)
            variantErrors.push({ variantId: variant.shopify_id, error: errorText })
          } else {
            console.log(`✅ Variant ${variant.shopify_id} updated successfully`)
            variantsUpdated++
          }
        } catch (variantError) {
          console.error(`Exception updating variant ${variant.shopify_id}:`, variantError)
          variantErrors.push({ variantId: variant.shopify_id, error: variantError.message })
        }
      }
    }

    console.log(`Updated ${variantsUpdated} out of ${variants?.length || 0} variants`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Product and ${variantsUpdated} variant(s) synced to Shopify`,
        synced: true,
        shopifyProduct: updatedProduct,
        variantsUpdated,
        variantErrors: variantErrors.length > 0 ? variantErrors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )


  } catch (error) {
    console.error('Error syncing to Shopify:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        synced: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
