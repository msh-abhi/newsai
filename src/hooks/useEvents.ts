import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../services/eventService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export const useEvents = () => {
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    data: eventSources = [],
    isLoading: sourcesLoading,
    error: sourcesError,
    refetch: refetchSources,
  } = useQuery({
    queryKey: ['event-sources', currentOrganization?.id],
    queryFn: () => 
      currentOrganization 
        ? eventService.getEventSources(currentOrganization.id)
        : [],
    enabled: !!currentOrganization,
    staleTime: 30000, // 30 seconds
  });

  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['events', currentOrganization?.id],
    queryFn: () => 
      currentOrganization 
        ? eventService.getEvents(currentOrganization.id)
        : [],
    enabled: !!currentOrganization,
    staleTime: 60000, // 1 minute
  });

  const createEventSource = useMutation({
    mutationFn: eventService.createEventSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-sources'] });
      toast.success('Event source created successfully!');
    },
    onError: (error) => {
      console.error('Create event source error:', error);
      const errorMessage = error?.message || 'Failed to create event source';
      if (errorMessage.includes('Database connection failed')) {
        toast.error('Database not connected. Please connect to Supabase first.');
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const updateEventSource = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      eventService.updateEventSource(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-sources'] });
      toast.success('Event source updated successfully!');
    },
    onError: (error) => {
      console.error('Update event source error:', error);
      toast.error('Failed to update event source');
    },
  });

  const deleteEventSource = useMutation({
    mutationFn: eventService.deleteEventSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-sources'] });
      toast.success('Event source deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete event source error:', error);
      toast.error('Failed to delete event source');
    },
  });

  const triggerScraping = useMutation({
    mutationFn: ({ organizationId, sourceIds }: { organizationId: string; sourceIds?: string[] }) =>
      eventService.triggerScraping(organizationId, sourceIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-sources'] });
      toast.success(data.message);
    },
    onError: (error) => {
      console.error('Trigger scraping error:', error);
      toast.error('Failed to trigger event scraping');
    },
  });

  const testEventSource = useMutation({
    mutationFn: ({ organizationId, sourceId }: { organizationId: string; sourceId: string }) =>
      eventService.testEventSource(organizationId, sourceId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Test successful! Found ${data.events.length} relevant events.`);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      console.error('Test event source error:', error);
      toast.error('Failed to test event source');
    },
  });

  const createMiamiSources = useMutation({
    mutationFn: (organizationId: string) =>
      eventService.createMiamiEventSources(organizationId),
    onSuccess: (sources) => {
      queryClient.invalidateQueries({ queryKey: ['event-sources'] });
      toast.success(`Created ${sources.length} Miami event sources successfully!`);
    },
    onError: (error) => {
      console.error('Create Miami sources error:', error);
      toast.error('Failed to create Miami event sources');
    },
  });

  const searchEvents = useMutation({
    mutationFn: (query: string) =>
      currentOrganization 
        ? eventService.searchEvents(currentOrganization.id, query)
        : [],
  });

  return {
    eventSources,
    events,
    sourcesLoading,
    eventsLoading,
    sourcesError,
    eventsError,
    refetchSources,
    refetchEvents,
    createEventSource,
    updateEventSource,
    deleteEventSource,
    triggerScraping,
    testEventSource,
    createMiamiSources,
    searchEvents,
  };
};