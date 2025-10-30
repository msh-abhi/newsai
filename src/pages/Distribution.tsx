import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Calendar,
  Users,
  TestTube,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  Settings,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import DistributionForm from '../components/Distribution/DistributionForm';
import SubscriberSegments from '../components/Distribution/SubscriberSegments';
import SendHistory from '../components/Distribution/SendHistory';
import { useQuery } from '@tanstack/react-query';
import { convertKitService } from '../services/convertKitService';
import { useAuthStore } from '../stores/authStore';
import { useAnalytics } from '../hooks/useAnalytics';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const Distribution: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'segments' | 'history'>('send');
  const { currentOrganization } = useAuthStore();
  const { overviewStats, isLoading: analyticsLoading } = useAnalytics();

  // Check ConvertKit connection status
  const { data: convertKitConfig } = useQuery({
    queryKey: ['convertkit-config', currentOrganization?.id],
    queryFn: () => currentOrganization ? convertKitService.getConfig(currentOrganization.id) : null,
    enabled: !!currentOrganization,
  });
  const convertKitConnected = convertKitConfig?.is_active || false;

  // Fetch ConvertKit subscribers
  const { data: subscribers = [], isLoading: subscribersLoading, error: subscribersError } = useQuery({
    queryKey: ['convertkit-subscribers', currentOrganization?.id],
    queryFn: () => currentOrganization && convertKitConnected ? convertKitService.getSubscribers(currentOrganization.id) : [],
    enabled: !!currentOrganization && convertKitConnected,
    retry: false, // Don't retry on auth errors
  });

  const stats = [
    {
      title: 'Total Subscribers',
      value: subscribersLoading ? '...' : subscribers.length.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Newsletters Sent',
      value: analyticsLoading ? '...' : (overviewStats?.newsletters_sent?.toString() || '0'),
      icon: Mail,
      color: 'text-green-600',
    },
    {
      title: 'Avg Open Rate',
      value: analyticsLoading ? '...' : (overviewStats ? `${overviewStats.open_rate.toFixed(1)}%` : '0%'),
      icon: CheckCircle,
      color: 'text-orange-600',
    },
    {
      title: 'Avg Click Rate',
      value: analyticsLoading ? '...' : (overviewStats ? `${overviewStats.click_rate.toFixed(1)}%` : '0%'),
      icon: Target,
      color: 'text-purple-600',
    },
  ];

  const tabs = [
    { id: 'send', name: 'Send Newsletter', icon: Send },
    { id: 'segments', name: 'Segments', icon: Target },
    { id: 'history', name: 'Send History', icon: Clock },
  ];

  if (!convertKitConnected) {
    return (
      <Card className="text-center">
        <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Email Service Not Connected
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Connect an email service provider in the Integrations section to send newsletters.
        </p>
        <Link to="/app/integrations">
          <Button variant="primary" icon={Settings}>
            Go to Integrations
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Distribution Center
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage subscribers and send newsletters
            </p>
          </div>
          <Link to="/app/integrations">
             <Button variant="outline" icon={Settings}>
              Configure Integrations
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card hover padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card padding="sm">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {activeTab === 'send' && <DistributionForm />}
        {activeTab === 'segments' && <SubscriberSegments subscribers={subscribers} isLoading={subscribersLoading} />}
        {activeTab === 'history' && <SendHistory />}
      </motion.div>
    </div>
  );
};

export default Distribution;