import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import { useAuthStore } from '../stores/authStore';

export const useAnalytics = (timeRange: string = '30d') => {
  const { currentOrganization } = useAuthStore();

  const {
    data: overviewStats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['analytics', 'overview', currentOrganization?.id, timeRange],
    queryFn: () => 
      currentOrganization 
        ? analyticsService.getOverviewStats(currentOrganization.id, timeRange)
        : null,
    enabled: !!currentOrganization,
  });

  const {
    data: engagementData,
    isLoading: engagementLoading,
  } = useQuery({
    queryKey: ['analytics', 'engagement', currentOrganization?.id, timeRange],
    queryFn: () => 
      currentOrganization 
        ? analyticsService.getEngagementData(currentOrganization.id, timeRange)
        : null,
    enabled: !!currentOrganization,
  });

  const {
    data: modelUsage,
    isLoading: usageLoading,
  } = useQuery({
    queryKey: ['analytics', 'model-usage', currentOrganization?.id],
    queryFn: () => 
      currentOrganization 
        ? analyticsService.getModelUsage(currentOrganization.id)
        : null,
    enabled: !!currentOrganization,
  });

  const {
    data: newsletterPerformance,
    isLoading: performanceLoading,
  } = useQuery({
    queryKey: ['analytics', 'newsletter-performance', currentOrganization?.id],
    queryFn: () => 
      currentOrganization 
        ? analyticsService.getNewsletterPerformance(currentOrganization.id)
        : null,
    enabled: !!currentOrganization,
  });

  return {
    overviewStats,
    engagementData,
    modelUsage,
    newsletterPerformance,
    isLoading: statsLoading || engagementLoading || usageLoading || performanceLoading,
    error: statsError,
  };
};