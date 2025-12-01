// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function createProductDescription(product: any, variants: any[]): string {
  const variantText = variants.length > 0 
    ? variants.map(v => `${v.title}: $${v.price} (stock: ${v.inventory_quantity})`).join(', ')
    : `Precio: $${product.price} (stock: ${product.stock})`;
  
  // Incluir información de imágenes
  const imageInfo = product.images && product.images.length > 0 
    ? `Imágenes del producto: ${product.images.length} imagen(es) disponible(s).`
    : 'Sin imágenes disponibles.';
  
  return `${product.name}. ${product.description || ''}. Categoría: ${product.category || 'Sin categoría'}. Variantes: ${variantText}. ${imageInfo}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Intentar leer body (puede no venir nada)
    let requestedUserId: string | null = null;
    let productId: string | null = null;
    let offset = 0;
    let pageSize = 200;
    let reset = false;
    try {
      const contentType = req.headers.get('content-type');
      console.log('generate-product-embeddings content-type:', contentType);
      const maybeBody = await req.json();
      requestedUserId = maybeBody?.userId || null;
      productId = maybeBody?.productId || null;
      offset = Number(maybeBody?.offset ?? 0) || 0;
      pageSize = Math.min(Math.max(Number(maybeBody?.pageSize ?? 200) || 200, 50), 500); // 50-500
      reset = Boolean(maybeBody?.reset) || false;
      console.log('generate-product-embeddings body.userId:', requestedUserId);
      console.log('generate-product-embeddings body.productId:', productId);
      console.log('generate-product-embeddings body.offset:', offset, 'pageSize:', pageSize, 'reset:', reset);
    } catch (e) {
      console.log('generate-product-embeddings no body or invalid JSON');
    }

    const authHeader = req.headers.get('Authorization');
    console.log('generate-product-embeddings has auth header:', !!authHeader);
    let requesterUserId: string | null = null;

    if (authHeader) {
      // Intentar obtener usuario desde el JWT (cuando viene desde el frontend)
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!authError && user) {
        requesterUserId = user.id;
      } else {
        console.log('generate-product-embeddings auth user not resolved via JWT');
      }
    }

    // Determinar usuario objetivo
    let targetUserId: string | null = null;

    if (requestedUserId && requestedUserId !== requesterUserId) {
      const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
        supabase.rpc('has_role', { _user_id: requesterUserId, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: requesterUserId, _role: 'super_admin' }),
      ]);

      if (isAdmin === true || isSuperAdmin === true) {
        targetUserId = requestedUserId;
      } else {
        console.log('Requester is not admin; using own userId');
        targetUserId = requesterUserId;
      }
    } else {
      targetUserId = requestedUserId || requesterUserId;
    }

    if (!targetUserId) {
      throw new Error('Unauthorized');
    }

    console.log(`Generating embeddings for user: ${targetUserId}${productId ? `, product: ${productId}` : ' (all products)'}`);

    // Obtener productos del usuario paginados
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        category,
        price,
        stock,
        is_active,
        images,
        product_variants (
          id,
          title,
          price,
          inventory_quantity,
          available
        )
      `)
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .range(offset, offset + pageSize - 1);
    
    // Si se especifica un productId, solo procesar ese producto
    if (productId) {
      query = query.eq('id', productId);
    }
    
    const { data: products, error: productsError } = await query;

    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }

    console.log(`Found ${products?.length || 0} products to process`);

    // Limpiar embeddings existentes
    if (productId) {
      // Si es un producto específico, solo eliminar su embedding
      const { error: deleteError } = await supabase
        .from('product_embeddings')
        .delete()
         .eq('user_id', targetUserId)
         .eq('product_id', productId);

      if (deleteError) {
        console.error('Error deleting existing embedding for product:', deleteError);
      }
    } else if (reset || offset === 0) {
      // En el primer lote, eliminar los embeddings del usuario
      const { error: deleteError } = await supabase
        .from('product_embeddings')
        .delete()
        .eq('user_id', targetUserId);

      if (deleteError) {
        console.error('Error deleting existing embeddings:', deleteError);
      }
    }

    let processedCount = 0;
    const batchSize = 5; // Procesar en lotes para evitar límites de rate

    for (let i = 0; i < (products?.length || 0); i += batchSize) {
      const batch = products!.slice(i, i + batchSize);
      
      const embeddingPromises = batch.map(async (product) => {
        try {
          const description = createProductDescription(product, product.product_variants || []);
          const embedding = await generateEmbedding(description);

          const variants = (product.product_variants || []).map((variant: any) => ({
            id: variant.id,
            title: variant.title,
            price: variant.price,
            stock: variant.inventory_quantity,
            available: variant.available
          }));

          // Calcular stock total: si hay variantes, sumar su inventario; sino usar product.stock
          const totalStock = variants.length > 0 
            ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
            : product.stock;

          return {
            user_id: targetUserId,
            product_id: product.id,
            product_name: product.name,
            product_description: product.description,
            category: product.category,
            price: product.price,
            stock: totalStock,
            images: product.images || [],
            variants,
            embedding: `[${embedding.join(',')}]`,
            metadata: {
              processed_at: new Date().toISOString(),
              description_length: description.length,
              images_count: (product.images || []).length
            }
          };
        } catch (error) {
          console.error(`Error processing product ${product.id}:`, error);
          return null;
        }
      });

      const embeddingResults = await Promise.all(embeddingPromises);
      const validEmbeddings = embeddingResults.filter(Boolean);

      if (validEmbeddings.length > 0) {
        const { error: insertError } = await supabase
          .from('product_embeddings')
          .insert(validEmbeddings);

        if (insertError) {
          console.error('Error inserting embeddings batch:', insertError);
        } else {
          processedCount += validEmbeddings.length;
          console.log(`Processed batch ${Math.floor(i/batchSize) + 1}, total: ${processedCount}`);
        }
      }

      // Pequeña pausa entre lotes
      if (i + batchSize < (products?.length || 0)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calcular hasMore y offsets
    let totalProducts = 0;
    try {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)
        .eq('is_active', true);
      totalProducts = count || 0;
    } catch (e) {
      console.log('Warning: could not get total products count');
    }
    const nextOffset = offset + (products?.length || 0);
    const hasMore = nextOffset < totalProducts;

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully generated embeddings for ${processedCount} products`,
      processedProducts: processedCount,
      hasMore,
      nextOffset,
      totalProducts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-product-embeddings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});