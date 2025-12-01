import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🛍️ Shopify Products Webhook - Received request:', req.method);

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

    // Process product events
    if (!['products/create', 'products/update', 'products/delete'].includes(shopifyTopic)) {
      console.log('🔄 Ignoring non-product event:', shopifyTopic);
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productData = await req.json();
    console.log('🛍️ Received product data:', JSON.stringify(productData, null, 2));

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

    // Handle product deletion
    if (shopifyTopic === 'products/delete') {
      console.log('🗑️ Processing product deletion for Shopify ID:', productData.id);
      
      // Find and delete the product
      const { data: productToDelete, error: findError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', integration.user_id)
        .eq('shopify_id', productData.id.toString())
        .single();

      if (findError || !productToDelete) {
        console.log('⚠️ Product not found for deletion:', productData.id);
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Product not found or already deleted' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete product embeddings
      await supabase
        .from('product_embeddings')
        .delete()
        .eq('product_id', productToDelete.id)
        .eq('user_id', integration.user_id);

      // Delete product image embeddings
      await supabase
        .from('product_image_embeddings')
        .delete()
        .eq('product_id', productToDelete.id)
        .eq('user_id', integration.user_id);

      // Delete product variants
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productToDelete.id)
        .eq('user_id', integration.user_id);

      // Delete the product itself
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)
        .eq('user_id', integration.user_id);

      if (deleteError) {
        console.error('❌ Error deleting product:', deleteError);
        return new Response(JSON.stringify({ error: 'Failed to delete product' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Successfully deleted product:', productToDelete.id);

      return new Response(JSON.stringify({ 
        success: true, 
        productId: productToDelete.id,
        action: 'deleted',
        message: 'Product deleted successfully' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if product exists
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', integration.user_id)
      .eq('shopify_id', productData.id.toString())
      .single();

    // Prepare product data
    const productInfo = {
      user_id: integration.user_id,
      name: productData.title,
      description: productData.body_html || productData.description || '',
      price: productData.variants?.[0]?.price ? parseFloat(productData.variants[0].price) : 0,
      stock: productData.variants?.reduce((total: number, variant: any) => 
        total + (parseInt(variant.inventory_quantity) || 0), 0) || 0,
      shopify_id: productData.id.toString(),
      shopify_handle: productData.handle,
      category: productData.product_type || null,
      vendor: productData.vendor || null,
      tags: productData.tags ? productData.tags.split(',').map((tag: string) => tag.trim()) : [],
      images: productData.images?.map((img: any) => ({
        url: img.src,
        alt: img.alt || productData.title,
        position: img.position || 1
      })) || [],
      is_active: productData.status === 'active',
    };

    let productId;

    if (existingProduct) {
      // Update existing product
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update(productInfo)
        .eq('id', existingProduct.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('❌ Error updating product:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update product' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      productId = updatedProduct.id;
      console.log('✏️ Updated existing product:', productId);
    } else {
      // Create new product
      const { data: newProduct, error: createError } = await supabase
        .from('products')
        .insert(productInfo)
        .select('id')
        .single();

      if (createError) {
        console.error('❌ Error creating product:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create product' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      productId = newProduct.id;
      console.log('🆕 Created new product:', productId);
    }

    // Process variants
    if (productData.variants && productData.variants.length > 0) {
      // Delete existing variants for this product
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', integration.user_id);

      // Create new variants
      for (const variant of productData.variants) {
        const variantInfo = {
          user_id: integration.user_id,
          product_id: productId,
          shopify_id: variant.id.toString(),
          shopify_product_id: productData.id.toString(),
          title: variant.title || 'Default Title',
          price: parseFloat(variant.price || '0'),
          compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
          cost_per_item: variant.cost_per_item ? parseFloat(variant.cost_per_item) : null,
          inventory_quantity: parseInt(variant.inventory_quantity) || 0,
          sku: variant.sku || null,
          barcode: variant.barcode || null,
          weight: variant.weight ? parseFloat(variant.weight) : null,
          weight_unit: variant.weight_unit || 'kg',
          option1: variant.option1 || null,
          option2: variant.option2 || null,
          option3: variant.option3 || null,
          available: variant.available !== false,
          inventory_management: variant.inventory_management || null,
          inventory_policy: variant.inventory_policy || 'deny',
          position: variant.position || 1,
        };

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantInfo);

        if (variantError) {
          console.error('❌ Error creating variant:', variantError);
        } else {
          console.log('✅ Created variant:', variant.title);
        }
      }
    }

    // Generate text embeddings for the product
    try {
      const { error: embeddingError } = await supabase.functions.invoke('generate-product-embeddings', {
        body: { productId, userId: integration.user_id }
      });
      
      if (embeddingError) {
        console.error('⚠️ Error generating embeddings:', embeddingError);
      } else {
        console.log('✅ Generated text embeddings for product');
      }
    } catch (embeddingError) {
      console.error('⚠️ Failed to generate embeddings:', embeddingError);
    }

    console.log('✅ Successfully processed Shopify product webhook');

    return new Response(JSON.stringify({ 
      success: true, 
      productId: productId,
      action: existingProduct ? 'updated' : 'created',
      message: 'Product processed successfully' 
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