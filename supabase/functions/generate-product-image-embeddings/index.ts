import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cache para el modelo CLIP
let clipModel: any = null;

async function initializeCLIPModel() {
  if (!clipModel) {
    console.log('🚀 Initializing CLIP model...');
    try {
      // Usar el modelo CLIP de OpenAI optimizado para JavaScript
      clipModel = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', {
        quantized: false,
      });
      console.log('✅ CLIP model initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing CLIP model:', error);
      throw error;
    }
  }
  return clipModel;
}

async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  try {
    console.log(`🔍 Generating CLIP embedding for image: ${imageUrl}`);

    // Inicializar el modelo si no está cargado
    const model = await initializeCLIPModel();

    // Descargar la imagen
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch image: ${imgRes.status} ${imgRes.statusText}`);
    }
    
    const arrayBuffer = await imgRes.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    
    // Crear una URL temporal para la imagen
    const imageObjectURL = URL.createObjectURL(blob);
    
    try {
      // Generar embedding usando Transformers.js
      const output = await model(imageObjectURL);
      
      // Extraer el embedding (normalmente está en output.data o directamente en output)
      const embedding: number[] = Array.isArray(output.data) ? output.data : 
                                  Array.isArray(output) ? output : 
                                  output.tolist ? output.tolist() : [];
      
      console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
      
      // Limpiar la URL temporal
      URL.revokeObjectURL(imageObjectURL);
      
      return embedding;
    } catch (modelError) {
      URL.revokeObjectURL(imageObjectURL);
      throw modelError;
    }
  } catch (e) {
    console.error('❌ Error generating image embedding:', e);
    throw e;
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, userId } = await req.json();

    if (!productId || !userId) {
      throw new Error('Product ID and User ID are required');
    }

    console.log(`Generating image embeddings for product: ${productId}, user: ${userId}`);

    // Obtener el producto y sus imágenes
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, images, user_id')
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${productError?.message}`);
    }

    const images = product.images as string[] || [];
    
    if (images.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No images found for this product',
        processedImages: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${images.length} images for product: ${product.name}`);

    // Eliminar embeddings existentes para este producto
    await supabase
      .from('product_image_embeddings')
      .delete()
      .eq('product_id', productId)
      .eq('user_id', userId);

    let processedCount = 0;

    // Generar embeddings para cada imagen
    for (const imageUrl of images) {
      try {
        // Ensure we have a URL string (handles objects like { url, alt })
        const urlString = typeof imageUrl === 'string' 
          ? imageUrl 
          : (imageUrl && (imageUrl as any).url ? (imageUrl as any).url : String(imageUrl));
        console.log(`Generating embedding for image: ${urlString}`);
        
        const embedding = await generateImageEmbedding(urlString);
        
        // Guardar embedding en la base de datos
        const { error: insertError } = await supabase
          .from('product_image_embeddings')
          .insert({
            product_id: productId,
            user_id: userId,
            image_url: urlString,
            image_embedding: `[${embedding.join(',')}]`
          });

        if (insertError) {
          console.error(`Error inserting embedding for image ${imageUrl}:`, insertError);
          continue;
        }

        processedCount++;
        console.log(`Successfully processed image ${processedCount}/${images.length}`);

      } catch (error) {
        const urlString = typeof imageUrl === 'string' ? imageUrl : String(imageUrl);
        console.error(`Error processing image ${urlString}:`, error);
        continue;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully generated embeddings for ${processedCount} images`,
      processedImages: processedCount,
      totalImages: images.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-product-image-embeddings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});