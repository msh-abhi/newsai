import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsletterService } from '../services/newsletterService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export const useNewsletters = () => {
  const { currentOrganization, user } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    data: newsletters,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['newsletters', currentOrganization?.id],
    queryFn: () => 
      currentOrganization 
        ? newsletterService.getNewsletters(currentOrganization.id)
        : [],
    enabled: !!currentOrganization,
  });

  const createNewsletter = useMutation({
    mutationFn: (newsletter: any) =>
      newsletterService.createNewsletter({
        ...newsletter,
        organization_id: currentOrganization!.id,
        created_by: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Newsletter created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create newsletter');
      console.error('Create newsletter error:', error);
    },
  });

  const updateNewsletter = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      newsletterService.updateNewsletter(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      // Only show success toast for manual saves, not auto-saves
    },
    onError: (error) => {
      console.error('Update newsletter error:', error);
      // Don't show error toast for auto-save operations to avoid spam
      if (!error?.message?.includes('auto-save')) {
        toast.error('Failed to update newsletter');
      }
    },
  });

  const deleteNewsletter = useMutation({
    mutationFn: newsletterService.deleteNewsletter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Newsletter deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete newsletter');
      console.error('Delete newsletter error:', error);
    },
  });

  return {
    newsletters,
    isLoading,
    error,
    createNewsletter,
    updateNewsletter,
    deleteNewsletter,
  };
};