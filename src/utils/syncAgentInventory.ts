import { supabase } from '@/integrations/supabase/client';

export async function syncAgentInventory(): Promise<{ success: boolean; message: string; syncedProducts?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-agent-inventory', {
      method: 'POST'
    });

    if (error) {
      console.error('Error syncing agent inventory:', error);
      return { success: false, message: 'Error syncing inventory: ' + error.message };
    }

    return data;
  } catch (error) {
    console.error('Unexpected error syncing inventory:', error);
    return { success: false, message: 'Unexpected error: ' + (error as Error).message };
  }
}