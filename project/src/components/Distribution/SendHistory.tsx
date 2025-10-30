import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  BarChart3,
  Calendar,
} from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { useQuery } from '@tanstack/react-query';
import { newsletterService } from '../../services/newsletterService';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../UI/LoadingSpinner';
import { supabase } from '../../lib/supabase'; // Make sure this is imported
import { AlertTriangle } from 'lucide-react'; // Make sure this is imported

const SendHistory: React.FC = () => {
  const { currentOrganization } = useAuthStore();

  // Fetch sent newsletters
  const { data: newsletters = [], isLoading, error } = useQuery({
    queryKey: ['newsletters', 'sent', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      
      const allNewsletters = await newsletterService.getNewsletters(currentOrganization.id);
      return allNewsletters.filter(newsletter => newsletter.status === 'sent');
    },
    enabled: !!currentOrganization,
  });

  // Fetch analytics for sent newsletters
  const { data: analyticsData = [] } = useQuery({
    queryKey: ['newsletter-analytics', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      
      const { data, error } = await supabase
        .from('newsletter_analytics')
        .select('*')
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization,
  });

  // Combine newsletter and analytics data
  const sendHistory = newsletters.map(newsletter => {
    const analytics = analyticsData.find(a => a.newsletter_id === newsletter.id);
    return {
      id: newsletter.id,
      newsletter_title: newsletter.title,
      sent_at: newsletter.sent_at || newsletter.updated_at,
      status: newsletter.status,
      recipient_count: analytics?.sent_count || 0,
      opens: analytics?.opens || 0,
      clicks: analytics?.clicks || 0,
      open_rate: analytics?.sent_count > 0 ? ((analytics?.opens || 0) / analytics.sent_count) * 100 : 0,
      click_rate: analytics?.opens > 0 ? ((analytics?.clicks || 0) / analytics.opens) * 100 : 0,
    };
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'sending':
        return <Clock size={16} className="text-blue-600" />;
      default:
        return <AlertCircle size={16} className="text-orange-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to Load Send History
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            There was an error loading your newsletter send history.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        {sendHistory.length > 0 ? (
          <div className="space-y-4">
            {sendHistory.map((send, index) => (
              <motion.div
                key={send.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(send.status)}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {send.newsletter_title}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-300">
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {new Date(send.sent_at).toLocaleDateString()}
                      </span>
                      <span>{send.recipient_count.toLocaleString()} recipients</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {send.opens.toLocaleString()} opens ({send.open_rate.toFixed(1)}%)
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {send.clicks.toLocaleString()} clicks ({send.click_rate.toFixed(1)}%)
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" icon={Eye}>
                      View
                    </Button>
                    <Button variant="ghost" size="sm" icon={BarChart3}>
                      Analytics
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Newsletters Sent Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Once you send your first newsletter, you'll see the send history and analytics here.
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = '/app/generate'}
            >
              Generate Your First Newsletter
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SendHistory;