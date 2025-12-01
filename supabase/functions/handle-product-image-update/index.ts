import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { productId, userId } = await req.json();

    if (!productId || !userId) {
      return new Response(
        JSON.stringify({ error: 'productId and userId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get updated product details
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('id, name, images, user_id, updated_at')
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No images to upload',
          uploaded: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Helper to detect videos
    const isVideo = (url: string) => {
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
      return videoExtensions.some(ext => url.toLowerCase().includes(ext));
    };

    // Filter out videos - only process images
    const imageUrls = product.images.filter((url: string) => !isVideo(url));

    if (imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No images to upload (only videos found)',
          uploaded: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let uploadedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Upload each image to the external service
    for (const imageUrl of imageUrls) {
      try {
        // Download the image from Supabase Storage
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }

        const imageBlob = await imageResponse.blob();
        const imageFile = new File([imageBlob], `${product.name}_${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });

        // Upload to external service
        const formData = new FormData();
        formData.append('name', product.name);
        formData.append('user_id', userId);
        formData.append('image', imageFile);

        const uploadResponse = await fetch('https://web-production-b53d.up.railway.app/upload-product', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          uploadedCount++;
        } else {
          failedCount++;
          errors.push(`Failed to upload image: ${uploadResponse.status}`);
        }
      } catch (error) {
        failedCount++;
        errors.push(`Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: uploadedCount > 0,
        message: `${uploadedCount} imágenes actualizadas exitosamente${failedCount > 0 ? `, ${failedCount} fallaron` : ''}`,
        uploaded: uploadedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in handle-product-image-update function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
