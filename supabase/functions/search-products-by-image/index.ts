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
    console.log('🚀 Initializing CLIP model for search...');
    try {
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

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(clean);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function generateEmbeddingFromBytes(bytes: Uint8Array): Promise<number[]> {
  console.log(`🔍 Generating CLIP embedding from raw bytes (${bytes.byteLength} bytes)`);

  const model = await initializeCLIPModel();
  
  // Crear blob desde bytes
  const blob = new Blob([bytes as unknown as ArrayBuffer]);
  const imageObjectURL = URL.createObjectURL(blob);
  
  try {
    const output = await model(imageObjectURL);
    const embedding: number[] = Array.isArray(output.data) ? output.data : 
                                Array.isArray(output) ? output : 
                                output.tolist ? output.tolist() : [];
    
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    URL.revokeObjectURL(imageObjectURL);
    return embedding;
  } catch (error) {
    URL.revokeObjectURL(imageObjectURL);
    throw error;
  }
}

async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  console.log(`🔍 Downloading image for embedding: ${imageUrl}`);
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    const errorText = await imgRes.text();
    console.error(`Image fetch error: ${imgRes.status} - ${errorText}`);
    throw new Error(`Image fetch error: ${imgRes.statusText}`);
  }
  const arrayBuffer = await imgRes.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  return await generateEmbeddingFromBytes(bytes);
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageBase64, imageUrl, userId, limit = 5, threshold = 0.5 } = body;

    if (!userId || (!imageBase64 && !imageUrl)) {
      console.log('Invalid payload', { hasUserId: !!userId, hasBase64: !!imageBase64, hasUrl: !!imageUrl });
      return new Response(JSON.stringify({ success: false, error: 'Image (base64) or URL and User ID are required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    console.log(`Searching products by image for user: ${userId}`, {
      base64Len: imageBase64 ? imageBase64.length : 0,
      hasUrl: !!imageUrl,
      limit,
      threshold
    });

    // Generar embedding de la imagen enviada
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = imageBase64
        ? await generateEmbeddingFromBytes(base64ToBytes(imageBase64))
        : await generateImageEmbedding(imageUrl!);
    } catch (e) {
      console.error('Embedding generation failed:', e);
      return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Embedding generation failed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
    console.log('Generated query image embedding');

    // Buscar productos similares usando la función RPC
    const { data: results, error } = await supabase.rpc('search_products_by_image_similarity', {
      target_user_id: userId,
      query_embedding: `[${queryEmbedding.join(',')}]`,
      similarity_threshold: threshold,
      match_count: limit
    });

    if (error) {
      throw new Error(`Database search error: ${error.message}`);
    }

    console.log(`Found ${results?.length || 0} similar products by image`);

    // Si no encontramos resultados con la función, usar consulta directa con cálculo manual
    if (!results || results.length === 0) {
      console.log('RPC function failed, trying manual similarity calculation');
      
      const { data: fallbackResults, error: fallbackError } = await supabase
        .from('product_image_embeddings')
        .select(`
          product_id,
          image_url,
          image_embedding,
          products!inner(
            id,
            name,
            description,
            category,
            price,
            stock,
            images
          )
        `)
        .eq('user_id', userId);

      if (fallbackError) {
        throw new Error(`Fallback search error: ${fallbackError.message}`);
      }

      // Calcular similitud coseno manualmente
      const similarities = (fallbackResults || [])
        .map((item: any) => {
          const embedding1 = queryEmbedding as number[];
          const raw = item.image_embedding;
          let embedding2: number[] = [];
          if (Array.isArray(raw)) embedding2 = raw as number[];
          else if (typeof raw === 'string') {
            try { embedding2 = JSON.parse(raw); } catch { embedding2 = []; }
          }
          if (!embedding2.length) return null;

          // Calcular similitud coseno
          let dotProduct = 0;
          let norm1 = 0;
          let norm2 = 0;
          const len = Math.min(embedding1.length, embedding2.length);
          for (let i = 0; i < len; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
          }
          const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

          return {
            product_id: item.products?.id,
            product_name: item.products?.name,
            product_description: item.products?.description,
            category: item.products?.category,
            price: item.products?.price,
            stock: item.products?.stock,
            images: item.products?.images,
            similarity,
            matched_image_url: item.image_url
          } as any;
        })
        .filter((item: any) => item && item.similarity >= threshold)
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit);


      return new Response(JSON.stringify({
        success: true,
        imageUrl,
        results: similarities,
        count: similarities.length,
        searchType: 'image'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl,
      results: results || [],
      count: results?.length || 0,
      searchType: 'image'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in search-products-by-image:', error);
    // Devolver 200 para exponer el mensaje de error al cliente y evitar FunctionsHttpError
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});