import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '../services/knowledgeService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export const useKnowledge = (type?: string) => {
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['knowledge', currentOrganization?.id, type],
    queryFn: () => 
      currentOrganization 
        ? knowledgeService.getItems(currentOrganization.id, type)
        : [],
    enabled: !!currentOrganization,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const createItem = useMutation({
    mutationFn: knowledgeService.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      toast.success('Knowledge item created successfully!');
    },
    onError: (error) => {
      console.error('Create knowledge item error:', error);
      const errorMessage = error?.message || 'Failed to create knowledge item';
      if (errorMessage.includes('Database connection failed')) {
        toast.error('Database not connected. Please connect to Supabase first.');
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      knowledgeService.updateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      toast.success('Knowledge item updated successfully!');
    },
    onError: (error) => {
      console.error('Update knowledge item error:', error);
      const errorMessage = error?.message || 'Failed to update knowledge item';
      if (errorMessage.includes('Database connection failed')) {
        toast.error('Database not connected. Please connect to Supabase first.');
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const deleteItem = useMutation({
    mutationFn: knowledgeService.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      toast.success('Knowledge item deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete knowledge item error:', error);
      const errorMessage = error?.message || 'Failed to delete knowledge item';
      if (errorMessage.includes('Database connection failed')) {
        toast.error('Database not connected. Please connect to Supabase first.');
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const searchItems = useMutation({
    mutationFn: (query: string) =>
      currentOrganization 
        ? knowledgeService.searchItems(currentOrganization.id, query)
        : [],
  });

  return {
    items,
    isLoading,
    error,
    refetch,
    createItem,
    updateItem,
    deleteItem,
    searchItems,
  };
};