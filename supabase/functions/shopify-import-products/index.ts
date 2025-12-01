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
    const { shopDomain, accessToken, userId, pageInfo: pageInfoInput, pagesPerRun } = await req.json()

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

    // Use provided userId (for admin operations) or authenticated user's id
    const targetUserId = userId || user.id
    console.log(`Importing products for user: ${targetUserId}`)
    console.log(`Authenticated user (admin): ${user.id}`)
    
    // If importing for another user (admin operation), use service role client
    const dbClient = userId && userId !== user.id 
      ? createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )
      : supabaseClient

    let allProducts: any[] = []
    let hasMore = false
    
    // Cursor-based pagination using Link header and page_info
    let pageInfo = pageInfoInput || ''
    const maxPages = Number(pagesPerRun) > 0 ? Number(pagesPerRun) : 3
    let pageCount = 0

    async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

    async function fetchWithRetry(url: string, headers: Record<string, string>, retries = 3) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url, { method: 'GET', headers })
        // Handle rate limit with backoff
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('Retry-After') || 2)
          console.warn(`Rate limited by Shopify. Waiting ${retryAfter}s before retry...`)
          await sleep(retryAfter * 1000)
          continue
        }
        if (res.ok) return res
        // Retry on transient 5xx errors
        if (res.status >= 500 && attempt < retries) {
          const backoff = (attempt + 1) * 1000
          console.warn(`Shopify ${res.status}. Retry in ${backoff}ms (attempt ${attempt + 1}/${retries})`)
          await sleep(backoff)
          continue
        }
        return res
      }
      // Final attempt failed
      return await fetch(url, { method: 'GET', headers })
    }

    while (true) {
      const url = pageInfo
        ? `https://${shopDomain}/admin/api/2025-01/products.json?limit=250&page_info=${pageInfo}`
        : `https://${shopDomain}/admin/api/2025-01/products.json?limit=250&published_status=any`
      console.log(`Fetching products page ${pageCount + 1} from: ${url}`)

      const response = await fetchWithRetry(url, {
        'X-Shopify-Access-Token': decodedToken,
        'Content-Type': 'application/json'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Shopify API error:', response.status, response.statusText, errorText)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Shopify API error: ${response.status} ${response.statusText} - ${errorText}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const data = await response.json()
      const products = data.products || []
      console.log(`Fetched ${products.length} products in this page`)

      allProducts.push(...products)
      pageCount++

      // Parse Link header for next page
      const linkHeader = response.headers.get('Link') || ''
      let nextPageInfo = ''
      if (linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
        if (match) {
          try {
            const nextUrl = new URL(match[1])
            nextPageInfo = nextUrl.searchParams.get('page_info') || ''
          } catch (_) {
            // Fallback: try extracting page_info param manually
            const m2 = match[1].match(/[?&]page_info=([^&]+)/)
            nextPageInfo = m2 ? decodeURIComponent(m2[1]) : ''
          }
        }
      }

      if (nextPageInfo) {
        if (pageCount >= maxPages) {
          hasMore = true
          pageInfo = nextPageInfo
          console.log(`Reached page limit ${maxPages}, returning cursor to continue later`)
          break
        }
        pageInfo = nextPageInfo
        // Be nice to the API
        await sleep(300)
      } else {
        break
      }

      // Safety stop to avoid runaway execution
      if (pageCount > 200 || allProducts.length > 20000) {
        console.warn('Stopping import to prevent timeout: pages or products threshold reached')
        break
      }
    }

    console.log(`Total products to import: ${allProducts.length}`)

    // Transform and save products to our main products table
    let importedCount = 0
    for (const shopifyProduct of allProducts) {
      try {
        // Check if product already exists by shopify_id first
        const { data: existingProduct } = await dbClient
          .from('products')
          .select('id')
          .eq('shopify_id', shopifyProduct.id.toString())
          .eq('user_id', targetUserId)
          .maybeSingle()
        
        const finalProductId = existingProduct?.id || crypto.randomUUID()
        
        // Prepare product data
        const productUpdateData = {
          name: shopifyProduct.title,
          description: shopifyProduct.body_html || null,
          price: shopifyProduct.variants?.[0]?.price ? parseFloat(shopifyProduct.variants[0].price) : 0,
          stock: shopifyProduct.variants?.reduce((total: number, variant: any) => total + (variant.inventory_quantity || 0), 0) || 0,
          category: shopifyProduct.product_type || null,
          images: shopifyProduct.images?.map((img: any) => img.src) || [],
          cover_image_index: 0,
          is_active: shopifyProduct.status === 'active',
          product_type: shopifyProduct.product_type || null,
          vendor: shopifyProduct.vendor || null,
          tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map((tag: string) => tag.trim()) : [],
          shopify_handle: shopifyProduct.handle || null,
          seo_title: shopifyProduct.title,
          seo_description: shopifyProduct.body_html ? shopifyProduct.body_html.substring(0, 160) : null,
          updated_at: new Date().toISOString()
        }
        
        if (existingProduct) {
          // Update existing product
          const { error: productError } = await dbClient
            .from('products')
            .update(productUpdateData)
            .eq('id', finalProductId)
            
          if (productError) {
            console.error('Error updating product:', shopifyProduct.id, productError)
            continue
          }
          console.log(`Updated existing product: ${shopifyProduct.title} (${shopifyProduct.id})`)
        } else {
          // Insert new product
          const { error: productError } = await dbClient
            .from('products')
            .insert({
              id: finalProductId,
              user_id: targetUserId,
              shopify_id: shopifyProduct.id.toString(),
              ...productUpdateData
            })
            
          if (productError) {
            console.error('Error inserting product:', shopifyProduct.id, productError)
            continue
          }
          console.log(`Imported new product: ${shopifyProduct.title} (${shopifyProduct.id})`)
        }

        // Now save each variant
        if (shopifyProduct.variants && Array.isArray(shopifyProduct.variants)) {
          for (const variant of shopifyProduct.variants) {
            try {
              // Check if variant already exists
              const { data: existingVariant } = await dbClient
                .from('product_variants')
                .select('id')
                .eq('shopify_id', variant.id.toString())
                .eq('user_id', targetUserId)
                .maybeSingle()
              
              const finalVariantId = existingVariant?.id || crypto.randomUUID()
              
              const variantUpdateData = {
                title: variant.title || 'Default Title',
                option1: variant.option1 || null,
                option2: variant.option2 || null,
                option3: variant.option3 || null,
                price: parseFloat(variant.price || '0'),
                compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
                inventory_quantity: variant.inventory_quantity || 0,
                inventory_management: variant.inventory_management || null,
                inventory_policy: variant.inventory_policy || 'deny',
                sku: variant.sku || null,
                barcode: variant.barcode || null,
                weight: variant.weight || null,
                weight_unit: variant.weight_unit || 'kg',
                available: variant.available !== false,
                position: variant.position || null,
                updated_at: new Date().toISOString()
              }

              if (existingVariant) {
                // Update existing variant
                const { error: variantError } = await dbClient
                  .from('product_variants')
                  .update(variantUpdateData)
                  .eq('id', existingVariant.id)
                  
                if (variantError) {
                  console.error('Error updating variant:', variant.id, variantError)
                } else {
                  console.log(`  - Updated variant: ${variant.title}`)
                }
              } else {
                // Insert new variant
                const { error: variantError } = await dbClient
                  .from('product_variants')
                  .insert({
                    id: finalVariantId,
                    user_id: targetUserId,
                    product_id: finalProductId,
                    shopify_id: variant.id.toString(),
                    shopify_product_id: shopifyProduct.id.toString(),
                    ...variantUpdateData
                  })
                  
                if (variantError) {
                  console.error('Error inserting variant:', variant.id, variantError)
                } else {
                  console.log(`  - Imported new variant: ${variant.title}`)
                }
              }

            } catch (variantProcessError) {
              console.error('Error processing variant:', variant.id, variantProcessError)
            }
          }
        }

        importedCount++
      } catch (productError) {
        console.error('Error processing product:', shopifyProduct.id, productError)
      }
    }

    // Generate embeddings in batch only when finished (no more pages)
    if (!hasMore) {
      console.log('🔄 Starting batch embedding generation for all imported products...');
      try {
        const { error: batchEmbeddingError } = await dbClient.functions.invoke('generate-product-embeddings', {
          body: { userId: targetUserId }
        });
        
        if (batchEmbeddingError) {
          console.error('⚠️ Error in batch embedding generation:', batchEmbeddingError);
        } else {
          console.log('✅ Batch embedding generation completed');
        }
      } catch (batchError) {
        console.error('⚠️ Failed batch embedding generation:', batchError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: importedCount,
        total_found: allProducts.length,
        hasMore,
        nextPageInfo: hasMore ? pageInfo : null,
        message: `${importedCount} products imported${hasMore ? ' (more pending...)' : ''}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error importing products:', error)
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