import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UsageLimits {
  // Plan details
  plan_id: string;
  plan_name: string;
  max_products: number;
  max_ai_messages: number;
  extra_message_cost: number | null;
  subscription_status: string;
  period_end: string | null;

  // Current usage
  ai_messages_used: number;
  extra_messages_purchased: number;
  products_count: number;

  // Blocking status
  ai_messages_blocked: boolean;

  // Calculated limits
  can_add_products: boolean;
  can_send_ai_messages: boolean;
  products_remaining: number;
  ai_messages_remaining: number;
  
  // Pending charges
  pending_charge_amount: number;
}

export const useUsageLimits = () => {
  const { user } = useAuth();
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageLimits = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('check-usage-limits');

      if (fetchError) {
        console.error('Error fetching usage limits:', fetchError);
        setError('Error al cargar los límites de uso');
        return;
      }

      setUsageLimits(data);
    } catch (err) {
      console.error('Error fetching usage limits:', err);
      setError('Error al cargar los límites de uso');
    } finally {
      setLoading(false);
    }
  };

  const checkCanAddProduct = () => {
    return usageLimits?.can_add_products ?? false;
  };

  const checkCanSendAIMessage = () => {
    return usageLimits?.can_send_ai_messages ?? false;
  };

  const getProductsRemaining = () => {
    return usageLimits?.products_remaining ?? 0;
  };

  const getAIMessagesRemaining = () => {
    return usageLimits?.ai_messages_remaining ?? 0;
  };

  const getUsagePercentage = () => {
    if (!usageLimits) return 0;
    const totalLimit = usageLimits.max_ai_messages + usageLimits.extra_messages_purchased;
    return Math.round((usageLimits.ai_messages_used / totalLimit) * 100);
  };

  const isBlocked = () => {
    return usageLimits?.ai_messages_blocked ?? false;
  };

  useEffect(() => {
    fetchUsageLimits();
  }, [user]);

  return {
    usageLimits,
    loading,
    error,
    fetchUsageLimits,
    checkCanAddProduct,
    checkCanSendAIMessage,
    getProductsRemaining,
    getAIMessagesRemaining,
    getUsagePercentage,
    isBlocked,
  };
};