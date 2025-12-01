import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadProductImage(productName: string, userId: string, imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📤 Uploading image for product: ${productName}, user: ${userId}`);
    console.log(`🔗 Image URL: ${imageUrl}`);
    
    // Download the image from Supabase Storage
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], `${productName}_${Date.now()}.jpg`, {
      type: 'image/jpeg'
    });

    // Upload to external service using the exact curl format
    const formData = new FormData();
    formData.append('name', productName);
    formData.append('user_id', userId);
    formData.append('image', imageFile);

    console.log(`🚀 Sending to external service...`);
    const uploadResponse = await fetch('https://web-production-b53d.up.railway.app/upload-product', {
      method: 'POST',
      body: formData,
    });

    const responseText = await uploadResponse.text();
    console.log(`📋 Upload response status: ${uploadResponse.status}, body: ${responseText}`);

    if (uploadResponse.ok) {
      console.log(`✅ Successfully uploaded image for product: ${productName}`);
      return { success: true };
    } else {
      const errorMsg = `Failed to upload image for ${productName}: ${uploadResponse.status} - ${responseText}`;
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = `Error uploading image for ${productName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

interface RetryParams {
  productId: string;
  userId: string;
  imageUrl: string;
  productName?: string;
}

interface UploadRequest {
  adminUserId: string;
  selectedUserIds?: string[];
  batchSize?: number;
  offset?: number;
  retry?: RetryParams;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminUserId, selectedUserIds, batchSize = 5, offset = 0, retry } = await req.json() as UploadRequest;

    console.log(`📋 Batch processing request: {
  adminUserId: "${adminUserId}",
  selectedUserIds: ${JSON.stringify(selectedUserIds)},
  selectedCount: ${selectedUserIds ? selectedUserIds.length : 0},
  batchSize: ${batchSize},
  offset: ${offset}
}`);

    // Verify admin permissions
    const { data: hasRole, error: roleError } = await supabase.rpc('has_role', {
      _user_id: adminUserId,
      _role: 'super_admin'
    });

    if (roleError || !hasRole) {
      console.error('❌ Access denied for user:', adminUserId);
      return new Response(JSON.stringify({ 
        error: 'Access denied. Super admin role required.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Retry single image if requested
    if (retry) {
      console.log(`🔁 Retry requested for product ${retry.productId} image: ${retry.imageUrl}`);
      const result = await uploadProductImage(retry.productName || 'Unknown', retry.userId, retry.imageUrl);
      const response = {
        success: result.success,
        mode: 'retry',
        productId: retry.productId,
        userId: retry.userId,
        imageUrl: retry.imageUrl,
        message: result.success ? 'Retry successful' : result.error
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      });
    }

    console.log(`🚀 Starting batch image upload (batch ${Math.floor(offset / batchSize) + 1})...`);

    // Get products with images for selected users
    let query = supabase
      .from('products')
      .select('id, name, user_id, images')
      .eq('is_active', true);

    if (selectedUserIds && selectedUserIds.length > 0) {
      console.log(`Filtering for ${selectedUserIds.length} selected users: ${JSON.stringify(selectedUserIds)}`);
      query = query.in('user_id', selectedUserIds);
    }

    // Add pagination for batch processing
    query = query.range(offset, offset + batchSize - 1);

    const { data: products, error: productsError } = await query;

    if (productsError) {
      throw new Error(`Database query failed: ${productsError.message}`);
    }

    const productsWithImages = (products || []).filter(
      p => p.images && Array.isArray(p.images) && p.images.length > 0
    ) || [];

    console.log(`📊 Processing batch: ${productsWithImages.length} products (offset: ${offset})`);

    // Process batch of products with detailed progress tracking
    let totalProcessed = 0;
    let totalErrors = 0;
    const processedUsers = new Set();
    const errors: string[] = [];
    const productResults: any[] = [];

    for (let productIndex = 0; productIndex < productsWithImages.length; productIndex++) {
      const product = productsWithImages[productIndex];
      const globalProductIndex = offset + productIndex + 1;
      
      console.log(`🔄 [${globalProductIndex}] Processing product: ${product.name} for user: ${product.user_id}`);
      
      let productImageCount = 0;
      let productErrors = 0;
      const imageResults: any[] = [];

      // Process each image individually with complete error isolation
      for (let i = 0; i < product.images.length; i++) {
        const imageUrl = product.images[i];
        
        try {
          console.log(`📤 [${globalProductIndex}] Uploading image ${i + 1}/${product.images.length}: ${product.name}`);
          console.log(`🔗 Image URL: ${imageUrl}`);
          
          const result = await uploadProductImage(product.name, product.user_id, imageUrl);
          
          if (result.success) {
            productImageCount++;
            totalProcessed++;
            const successMsg = `✅ Image ${i + 1}/${product.images.length} uploaded successfully for: ${product.name}`;
            console.log(successMsg);
            imageResults.push({
              imageIndex: i + 1,
              imageUrl,
              status: 'success',
              message: 'Upload successful'
            });
          } else {
            productErrors++;
            totalErrors++;
            const errorMsg = `Failed image ${i + 1}/${product.images.length} for ${product.name}: ${result.error}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
            imageResults.push({
              imageIndex: i + 1,
              imageUrl,
              status: 'error',
              message: result.error
            });
          }
        } catch (imageError) {
          productErrors++;
          totalErrors++;
          const errorMsg = `Exception uploading image ${i + 1}/${product.images.length} for ${product.name}: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`;
          console.error(`💥 ${errorMsg}`);
          errors.push(errorMsg);
          imageResults.push({
            imageIndex: i + 1,
            imageUrl,
            status: 'error',
            message: imageError instanceof Error ? imageError.message : 'Unknown error'
          });
        }

        // Small delay to avoid overwhelming the external service
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (productImageCount > 0) {
        processedUsers.add(product.user_id);
      }

      productResults.push({
        productId: product.id,
        productName: product.name,
        userId: product.user_id,
        totalImages: product.images.length,
        successfulImages: productImageCount,
        failedImages: productErrors,
        imageResults
      });

      console.log(`📋 Product ${product.name} completed: ${productImageCount} success, ${productErrors} errors`);
      console.log(`📊 Batch progress: ${totalProcessed} uploaded, ${totalErrors} failed`);
    }

    // Check if there are more products to process
    const hasMore = productsWithImages.length === batchSize;
    const nextOffset = hasMore ? offset + batchSize : null;

    const finalResult = {
      success: true,
      message: `✅ Batch ${Math.floor(offset / batchSize) + 1} completed: ${totalProcessed} imágenes subidas, ${totalErrors} errores`,
      batchInfo: {
        currentBatch: Math.floor(offset / batchSize) + 1,
        batchSize,
        offset,
        nextOffset,
        hasMore,
        processedInBatch: productsWithImages.length
      },
      totalImagesProcessed: totalProcessed,
      totalErrors: totalErrors,
      usersAffected: processedUsers.size,
      productsInBatch: productsWithImages.length,
      productResults,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`🎉 BATCH ${Math.floor(offset / batchSize) + 1} COMPLETED:`, finalResult);

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in bulk-upload-product-images:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});