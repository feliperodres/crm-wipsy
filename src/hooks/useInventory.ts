import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  baseStock: number;
  category: string;
  productType: string;
  vendor: string;
  tags: string[];
  images: string[];
  coverImage: string;
  shopifyId?: string;
  shopifyHandle?: string;
  variants: Array<{
    id: string;
    title: string;
    options: string[];
    price: number;
    compareAtPrice?: number;
    costPerItem?: number;
    inventory: number;
    sku?: string;
    barcode?: string;
    available: boolean;
    weight?: number;
    weightUnit: string;
    shopifyId?: string;
    position?: number;
  }>;
  totalStock: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryResponse {
  success: boolean;
  userId: string;
  summary: {
    totalProducts: number;
    totalVariants: number;
    totalStock: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    categories: string[];
    vendors: string[];
    productTypes: string[];
  };
  products: InventoryProduct[];
  meta: {
    timestamp: string;
    count: number;
  };
}

/**
 * Obtiene el inventario completo de un usuario usando su ID
 * @param userId - ID del usuario (requerido)
 * @returns Promise con el inventario del usuario
 */
export async function getInventory(userId: string): Promise<InventoryResponse> {
  try {
    // Construir la URL con parámetros
    const url = new URL(`https://fczgowziugcvrpgfelks.supabase.co/functions/v1/inventory-api`);
    url.searchParams.append('userId', userId);

    console.log('Fetching inventory from:', url.toString());

    // Realizar la solicitud sin autenticación compleja
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data: InventoryResponse = await response.json();
    
    console.log('Inventory loaded successfully:', data.summary);
    return data;

  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
}

/**
 * Obtiene el inventario completo de un usuario usando un hash
 * @param userHash - Hash del usuario (requerido)
 * @returns Promise con el inventario del usuario
 */
export async function getInventoryByHash(userHash: string): Promise<InventoryResponse> {
  try {
    // Construir la URL con parámetros
    const url = new URL(`https://fczgowziugcvrpgfelks.supabase.co/functions/v1/inventory-api`);
    url.searchParams.append('userHash', userHash);

    console.log('Fetching inventory from:', url.toString());

    // Realizar la solicitud sin autenticación compleja
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data: InventoryResponse = await response.json();
    
    console.log('Inventory loaded successfully:', data.summary);
    return data;

  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
}

/**
 * Función alternativa usando Supabase Functions invoke (más simple)
 */
export async function getInventoryWithSupabase(userId?: string): Promise<InventoryResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('inventory-api', {
      body: userId ? { user_id: userId } : undefined
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching inventory with Supabase:', error);
    throw error;
  }
}

/**
 * Hook personalizado para usar en componentes React
 */
export function useInventory(userId: string) {
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    if (!userId) {
      setError('userId es requerido');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getInventory(userId);
      setInventory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return {
    inventory,
    loading,
    error,
    fetchInventory,
    refetch: fetchInventory
  };
}