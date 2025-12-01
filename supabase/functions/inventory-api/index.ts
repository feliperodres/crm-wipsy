// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Inventory API request received:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for direct access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || url.searchParams.get('user_id');
    const userHash = url.searchParams.get('userHash') || url.searchParams.get('user_hash');

    if (!userId && !userHash) {
      return new Response(
        JSON.stringify({ 
          error: 'userId or userHash parameter is required',
          example: '?userId=your-user-id or ?userHash=your-user-hash'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let targetUserId = userId;

    // If userHash is provided, we could implement hash lookup logic here
    // For now, we'll treat userHash the same as userId
    if (userHash && !userId) {
      targetUserId = userHash;
    }

    // Fetch products with their variants
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        stock,
        category,
        images,
        cover_image_index,
        is_active,
        product_type,
        vendor,
        tags,
        shopify_id,
        shopify_handle,
        created_at,
        updated_at,
        product_variants (
          id,
          title,
          option1,
          option2,
          option3,
          price,
          compare_at_price,
          cost_per_item,
          inventory_quantity,
          sku,
          barcode,
          available,
          weight,
          weight_unit,
          shopify_id,
          position
        )
      `)
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products', details: productsError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform products for API response
    const inventory = products.map(product => {
      const coverImage = product.images && Array.isArray(product.images) && product.images.length > 0
        ? product.images[product.cover_image_index || 0] || product.images[0]
        : null;

      const variants = product.product_variants.map(variant => ({
        id: variant.id,
        title: variant.title,
        options: [variant.option1, variant.option2, variant.option3].filter(Boolean),
        price: variant.price,
        compareAtPrice: variant.compare_at_price,
        costPerItem: variant.cost_per_item,
        inventory: variant.inventory_quantity,
        sku: variant.sku,
        barcode: variant.barcode,
        available: variant.available,
        weight: variant.weight,
        weightUnit: variant.weight_unit,
        shopifyId: variant.shopify_id,
        position: variant.position
      }));

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.price,
        baseStock: product.stock,
        category: product.category,
        productType: product.product_type,
        vendor: product.vendor,
        tags: product.tags || [],
        images: Array.isArray(product.images) ? product.images : [],
        coverImage: coverImage,
        shopifyId: product.shopify_id,
        shopifyHandle: product.shopify_handle,
        variants: variants,
        totalStock: variants.length > 0 
          ? variants.reduce((sum, v) => sum + (v.inventory || 0), 0)
          : product.stock,
        available: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at
      };
    });

    // Calculate inventory summary
    const summary = {
      totalProducts: inventory.length,
      totalVariants: inventory.reduce((sum, p) => sum + p.variants.length, 0),
      totalStock: inventory.reduce((sum, p) => sum + p.totalStock, 0),
      lowStockProducts: inventory.filter(p => p.totalStock <= 5).length,
      outOfStockProducts: inventory.filter(p => p.totalStock === 0).length,
      categories: [...new Set(inventory.map(p => p.category).filter(Boolean))],
      vendors: [...new Set(inventory.map(p => p.vendor).filter(Boolean))],
      productTypes: [...new Set(inventory.map(p => p.productType).filter(Boolean))]
    };

    const response = {
      success: true,
      userId: targetUserId,
      summary: summary,
      products: inventory,
      meta: {
        timestamp: new Date().toISOString(),
        count: inventory.length
      }
    };

    console.log(`Successfully fetched inventory for user ${targetUserId}:`, {
      products: inventory.length,
      totalStock: summary.totalStock
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Inventory API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});