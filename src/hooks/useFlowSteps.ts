import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FlowStep {
  id: string;
  flow_id: string;
  step_order: number;
  step_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'delay' | 'ai_function';
  content: string | null;
  media_url: string | null;
  delay_seconds: number;
  ai_prompt: string | null;
  ai_config: any;
  created_at: string;
  updated_at: string;
}

export const useFlowSteps = (flowId: string | null) => {
  const queryClient = useQueryClient();

  const { data: steps, isLoading } = useQuery({
    queryKey: ['flow-steps', flowId],
    queryFn: async () => {
      if (!flowId) return [];

      const { data, error } = await supabase
        .from('flow_steps')
        .select('*')
        .eq('flow_id', flowId)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data as FlowStep[];
    },
    enabled: !!flowId,
  });

  const createStepMutation = useMutation({
    mutationFn: async (step: Omit<FlowStep, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('flow_steps')
        .insert(step)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newStep) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['flow-steps', flowId] });

      // Snapshot the previous value
      const previousSteps = queryClient.getQueryData<FlowStep[]>(['flow-steps', flowId]);

      // Optimistically update with temporary ID
      const optimisticStep: FlowStep = {
        ...newStep,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<FlowStep[]>(
        ['flow-steps', flowId],
        (old) => [...(old || []), optimisticStep]
      );

      return { previousSteps };
    },
    onSuccess: () => {
      toast.success('Paso agregado');
    },
    onError: (error, newStep, context) => {
      // Rollback on error
      if (context?.previousSteps) {
        queryClient.setQueryData(['flow-steps', flowId], context.previousSteps);
      }
      console.error('Error creating step:', error);
      toast.error('Error al crear el paso');
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server
      queryClient.invalidateQueries({ queryKey: ['flow-steps', flowId] });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FlowStep> }) => {
      const { data, error } = await supabase
        .from('flow_steps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['flow-steps', flowId] });

      const previousSteps = queryClient.getQueryData<FlowStep[]>(['flow-steps', flowId]);

      queryClient.setQueryData<FlowStep[]>(
        ['flow-steps', flowId],
        (old) =>
          old?.map((step) =>
            step.id === id
              ? { ...step, ...updates, updated_at: new Date().toISOString() }
              : step
          ) || []
      );

      return { previousSteps };
    },
    onError: (error, variables, context) => {
      if (context?.previousSteps) {
        queryClient.setQueryData(['flow-steps', flowId], context.previousSteps);
      }
      console.error('Error updating step:', error);
      toast.error('Error al actualizar el paso');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-steps', flowId] });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flow_steps')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['flow-steps', flowId] });

      const previousSteps = queryClient.getQueryData<FlowStep[]>(['flow-steps', flowId]);

      queryClient.setQueryData<FlowStep[]>(
        ['flow-steps', flowId],
        (old) => old?.filter((step) => step.id !== id) || []
      );

      return { previousSteps };
    },
    onSuccess: () => {
      toast.success('Paso eliminado');
    },
    onError: (error, id, context) => {
      if (context?.previousSteps) {
        queryClient.setQueryData(['flow-steps', flowId], context.previousSteps);
      }
      console.error('Error deleting step:', error);
      toast.error('Error al eliminar el paso');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-steps', flowId] });
    },
  });

  const reorderStepsMutation = useMutation({
    mutationFn: async (reorderedSteps: FlowStep[]) => {
      const updates = reorderedSteps.map((step, index) => ({
        id: step.id,
        step_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('flow_steps')
          .update({ step_order: update.step_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-steps', flowId] });
    },
    onError: (error) => {
      console.error('Error reordering steps:', error);
      toast.error('Error al reordenar los pasos');
    },
  });

  return {
    steps,
    isLoading,
    createStep: (step: Omit<FlowStep, 'id' | 'created_at' | 'updated_at'>) =>
      createStepMutation.mutate(step),
    updateStep: (id: string, updates: Partial<FlowStep>) =>
      updateStepMutation.mutate({ id, updates }),
    deleteStep: (id: string) => deleteStepMutation.mutate(id),
    reorderSteps: (steps: FlowStep[]) => reorderStepsMutation.mutate(steps),
  };
};
