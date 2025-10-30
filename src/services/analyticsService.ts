import { supabase } from '../lib/supabase';

export interface AnalyticsData {
  newsletters_sent: number;
  total_opens: number;
  total_clicks: number;
  open_rate: number;
  click_rate: number;
  cost_this_month: number;
  ai_calls_this_month: number;
  subscriber_growth: number;
}

class AnalyticsService {
  async getOverviewStats(organizationId: string, timeRange: string = '30d'): Promise<AnalyticsData> {
    try {
      // Get newsletter count
      const { data: newsletters, error: newsletterError } = await supabase
        .from('newsletters')
        .select('id, status')
        .eq('organization_id', organizationId)
        .eq('status', 'sent');

      if (newsletterError) throw newsletterError;

      // Get analytics data
      const { data: analytics, error: analyticsError } = await supabase
        .from('newsletter_analytics')
        .select('opens, clicks, sent_count')
        .eq('organization_id', organizationId);

      if (analyticsError) throw analyticsError;

      // Get AI provider usage
      const { data: aiProviders, error: aiError } = await supabase
        .from('ai_providers')
        .select('monthly_usage')
        .eq('organization_id', organizationId);

      if (aiError) throw aiError;

      const newsletters_sent = newsletters?.length || 0;
      const total_opens = analytics?.reduce((sum, item) => sum + (item.opens || 0), 0) || 0;
      const total_clicks = analytics?.reduce((sum, item) => sum + (item.clicks || 0), 0) || 0;
      const total_sent = analytics?.reduce((sum, item) => sum + (item.sent_count || 0), 0) || 0;
      const ai_calls_this_month = aiProviders?.reduce((sum, provider) => sum + (provider.monthly_usage || 0), 0) || 0;

      return {
        newsletters_sent,
        total_opens,
        total_clicks,
        open_rate: total_sent > 0 ? (total_opens / total_sent) * 100 : 0,
        click_rate: total_opens > 0 ? (total_clicks / total_opens) * 100 : 0,
        cost_this_month: ai_calls_this_month * 0.002, // Estimated cost
        ai_calls_this_month,
        subscriber_growth: 0, // TODO: Implement subscriber tracking
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Return zeros instead of mock data on error
      return {
        newsletters_sent: 0,
        total_opens: 0,
        total_clicks: 0,
        open_rate: 0,
        click_rate: 0,
        cost_this_month: 0,
        ai_calls_this_month: 0,
        subscriber_growth: 0,
      };
    }
  }

  async getEngagementData(organizationId: string, timeRange: string = '30d') {
    try {
      const { data, error } = await supabase
        .from('newsletter_analytics')
        .select(`
          opens,
          clicks,
          sent_count,
          created_at,
          newsletter:newsletters(sent_at)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date and aggregate
      const groupedData = (data || []).reduce((acc, item) => {
        const date = item.newsletter?.sent_at ? 
          new Date(item.newsletter.sent_at).toISOString().split('T')[0] : 
          new Date(item.created_at).toISOString().split('T')[0];
        
        if (!acc[date]) {
          acc[date] = { date, opens: 0, clicks: 0, subscribers: 0 };
        }
        
        acc[date].opens += item.opens || 0;
        acc[date].clicks += item.clicks || 0;
        acc[date].subscribers += item.sent_count || 0;
        
        return acc;
      }, {} as Record<string, any>);

      return Object.values(groupedData);
    } catch (error) {
      console.error('Error fetching engagement data:', error);
      return [];
    }
  }

  async getModelUsage(organizationId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('name, monthly_usage, monthly_limit')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;

      const totalUsage = (data || []).reduce((sum, provider) => sum + (provider.monthly_usage || 0), 0);

      return (data || []).map(provider => {
        const usage = totalUsage > 0 ? ((provider.monthly_usage || 0) / totalUsage) * 100 : 0;
        const cost = (provider.monthly_usage || 0) * 0.002; // Estimated cost per call
        
        return {
          name: provider.name,
          usage: Math.round(usage),
          cost: parseFloat(cost.toFixed(2)),
          color: this.getProviderColor(provider.name),
        };
      });
    } catch (error) {
      console.error('Error fetching model usage:', error);
      return [];
    }
  }

  private getProviderColor(name: string): string {
    const colors = {
      'OpenAI GPT-4': '#3B82F6',
      'Perplexity': '#8B5CF6',
      'Google Gemini': '#F97316',
      'Tavily API': '#10B981',
      'DeepSeek': '#EF4444',
    };
    return colors[name as keyof typeof colors] || '#6B7280';
  }

  async getNewsletterPerformance(organizationId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('newsletter_analytics')
        .select(`
          opens,
          clicks,
          sent_count,
          newsletter:newsletters(title)
        `)
        .eq('organization_id', organizationId)
        .order('opens', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(item => ({
        newsletter: item.newsletter?.title || 'Untitled Newsletter',
        opens: item.sent_count > 0 ? ((item.opens || 0) / item.sent_count) * 100 : 0,
        clicks: item.opens > 0 ? ((item.clicks || 0) / item.opens) * 100 : 0,
        engagement: item.sent_count > 0 ? (((item.opens || 0) + (item.clicks || 0)) / item.sent_count) * 100 : 0,
      }));
    } catch (error) {
      console.error('Error fetching newsletter performance:', error);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();