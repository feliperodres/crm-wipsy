import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerTag {
  id: string;
  customer_id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
  assigned_by_type: 'user' | 'agent' | 'system';
  assigned_at: string;
  tag: Tag;
}

export const useTags = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Error al cargar las etiquetas');
    } finally {
      setLoading(false);
    }
  };

  const createTag = async (name: string, color: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name,
          color,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setTags(prev => [...prev, data]);
      toast.success('Etiqueta creada exitosamente');
      return data;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Error al crear la etiqueta');
      throw error;
    }
  };

  const updateTag = async (id: string, name: string, color: string) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setTags(prev => prev.map(tag => tag.id === id ? data : tag));
      toast.success('Etiqueta actualizada exitosamente');
      return data;
    } catch (error) {
      console.error('Error updating tag:', error);
      toast.error('Error al actualizar la etiqueta');
      throw error;
    }
  };

  const deleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTags(prev => prev.filter(tag => tag.id !== id));
      toast.success('Etiqueta eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Error al eliminar la etiqueta');
      throw error;
    }
  };

  const assignTagToCustomer = async (customerId: string, tagId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('customer_tags')
        .insert({
          customer_id: customerId,
          tag_id: tagId,
          user_id: user.id
        });

      if (error) throw error;
      toast.success('Etiqueta asignada al cliente');
    } catch (error) {
      console.error('Error assigning tag:', error);
      toast.error('Error al asignar la etiqueta');
      throw error;
    }
  };

  const removeTagFromCustomer = async (customerId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('customer_tags')
        .delete()
        .eq('customer_id', customerId)
        .eq('tag_id', tagId);

      if (error) throw error;
      toast.success('Etiqueta removida del cliente');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Error al remover la etiqueta');
      throw error;
    }
  };

  const getCustomerTags = async (customerId: string): Promise<CustomerTag[]> => {
    try {
      // First get customer tags
      const { data: customerTagsData, error: customerTagsError } = await supabase
        .from('customer_tags')
        .select('*')
        .eq('customer_id', customerId)
        .eq('user_id', user?.id);

      if (customerTagsError) throw customerTagsError;

      if (!customerTagsData || customerTagsData.length === 0) {
        return [];
      }

      // Get the tags for these customer tags
      const tagIds = customerTagsData.map(ct => ct.tag_id);
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);

      if (tagsError) throw tagsError;

      // Combine the data
      return customerTagsData
        .map(customerTag => {
          const tag = tagsData?.find(t => t.id === customerTag.tag_id);
          if (!tag) return null;
          
          return {
            id: customerTag.id,
            customer_id: customerTag.customer_id,
            tag_id: customerTag.tag_id,
            user_id: customerTag.user_id,
            created_at: customerTag.created_at,
            assigned_by_type: (customerTag.assigned_by_type as 'user' | 'agent' | 'system') || 'user',
            assigned_at: customerTag.assigned_at || customerTag.created_at,
            tag: tag as Tag
          };
        })
        .filter(Boolean) as CustomerTag[];
    } catch (error) {
      console.error('Error fetching customer tags:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchTags();
  }, [user]);

  return {
    tags,
    loading,
    createTag,
    updateTag,
    deleteTag,
    assignTagToCustomer,
    removeTagFromCustomer,
    getCustomerTags,
    refetch: fetchTags
  };
};