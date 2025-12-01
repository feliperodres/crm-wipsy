import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutomationFlow {
  id: string;
  user_id: string;
  name: string;
  flow_type: string;
  is_active: boolean;
  trigger_conditions: any;
  created_at: string;
  updated_at: string;
}

export const useFlows = () => {
  const queryClient = useQueryClient();

  const { data: flows, isLoading, error } = useQuery({
    queryKey: ['automation-flows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_flows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutomationFlow[];
    },
  });

  const createFlowMutation = useMutation({
    mutationFn: async ({ name, flowType }: { name: string; flowType: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('automation_flows')
        .insert({
          user_id: user.id,
          name,
          flow_type: flowType,
          is_active: false,
          trigger_conditions: { on_first_message: true },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Flujo creado exitosamente');
    },
    onError: (error) => {
      console.error('Error creating flow:', error);
      toast.error('Error al crear el flujo');
    },
  });

  const updateFlowMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AutomationFlow> }) => {
      const { data, error } = await supabase
        .from('automation_flows')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
    },
    onError: (error) => {
      console.error('Error updating flow:', error);
      toast.error('Error al actualizar el flujo');
    },
  });

  const deleteFlowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automation_flows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Flujo eliminado');
    },
    onError: (error) => {
      console.error('Error deleting flow:', error);
      toast.error('Error al eliminar el flujo');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('automation_flows')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Estado actualizado');
    },
    onError: (error) => {
      console.error('Error toggling active:', error);
      toast.error('Error al cambiar el estado');
    },
  });

  return {
    flows,
    isLoading,
    error,
    createFlow: async (name: string, flowType: string = 'welcome') => {
      const result = await createFlowMutation.mutateAsync({ name, flowType });
      return result;
    },
    updateFlow: (id: string, updates: Partial<AutomationFlow>) =>
      updateFlowMutation.mutate({ id, updates }),
    deleteFlow: (id: string) => deleteFlowMutation.mutate(id),
    toggleActive: (id: string, isActive: boolean) =>
      toggleActiveMutation.mutate({ id, isActive }),
  };
};
