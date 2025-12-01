import { supabase } from '@/integrations/supabase/client';

export interface VectorSearchResult {
  product_id: string;
  product_name: string;
  product_description: string;
  category: string;
  price: number;
  stock: number;
  variants: any[];
  similarity: number;
}

export async function searchProductsVector(
  query: string, 
  userId: string, 
  options: { limit?: number; threshold?: number } = {}
): Promise<{ success: boolean; results?: VectorSearchResult[]; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('search-products-vector', {
      body: {
        query,
        userId,
        limit: options.limit || 10,
        threshold: options.threshold || 0.7
      }
    });

    if (error) {
      console.error('Error searching products:', error);
      return { success: false, error: error.message };
    }

    return {
      success: data.success,
      results: data.results,
      error: data.success ? undefined : data.error
    };
  } catch (error) {
    console.error('Unexpected error searching products:', error);
    return { success: false, error: (error as Error).message };
  }
}