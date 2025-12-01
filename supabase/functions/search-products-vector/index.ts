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

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId, limit = 10, threshold = 0.7 } = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Searching products for query: "${query}" for user: ${userId}`);

    // Generar embedding de la consulta
    const queryEmbedding = await generateQueryEmbedding(query);
    console.log('Generated query embedding');

    // Buscar productos similares usando la función de la base de datos
    const { data: results, error } = await supabase.rpc('search_products_by_similarity', {
      target_user_id: userId,
      query_embedding: `[${queryEmbedding.join(',')}]`,
      similarity_threshold: threshold,
      match_count: limit
    });

    if (error) {
      throw new Error(`Database search error: ${error.message}`);
    }

    console.log(`Found ${results?.length || 0} similar products`);

    return new Response(JSON.stringify({
      success: true,
      query,
      results: results || [],
      count: results?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in search-products-vector:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});