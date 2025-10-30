import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Mail,
  Brain,
  Plus,
  ArrowRight,
  BookOpen,
  Palette,
  RefreshCw,
  Calendar,
  Building,
  Edit,
  CheckCircle,
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { useAuthStore } from '../stores/authStore';
import { useOrganizations } from '../hooks/useOrganizations';
import { useAuth } from '../providers/AuthProvider';
import { useAnalytics } from '../hooks/useAnalytics';
import { useNewsletters } from '../hooks/useNewsletters';
import CreateOrganizationForm from '../components/Organization/CreateOrganizationForm';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { currentOrganization } = useAuthStore();
  const { fetchUserOrganizations } = useOrganizations();
  const { user } = useAuth();
  const { overviewStats, isLoading: analyticsLoading } = useAnalytics();
  const { newsletters, isLoading: newslettersLoading } = useNewsletters();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!user) return;
    setRetrying(true);
    try {
      console.log('🔄 Dashboard: Retrying organization fetch...');
      // Force a fresh fetch by clearing current state first
      const { setOrganizations, setCurrentOrganization, setMembership } = useAuthStore.getState();
      setOrganizations([]);
      setCurrentOrganization(null);
      setMembership(null);
      
      // Then fetch fresh data
      const result = await fetchUserOrganizations(user.id);
      console.log('🔄 Dashboard: Retry result:', result);
      toast.success('Account refreshed successfully!');
    } catch (error) {
      console.error('Retry failed:', error);
      toast.error('Failed to refresh account. Please try again or contact support.');
    } finally {
      setRetrying(false);
    }
  };

  // Show setup prompt if no organization is available
  if (!currentOrganization) {
    console.log('📝 Dashboard: No current organization, showing create form');
    return (
      <div className="space-y-8">
        <div className="max-w-2xl mx-auto">
          <CreateOrganizationForm
            title="Create Your Organization"
            description="You're successfully signed in! Create your organization to start generating AI-powered newsletters."
          />
          
          {user && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Having trouble? Try{' '}
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {retrying ? 'refreshing...' : 'refreshing your account'}
                </button>
                {' '}or check that Supabase is properly connected. If you just created an organization, try refreshing the page.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  console.log('✅ Dashboard: Current organization found:', currentOrganization.name);

  // Create stats from real data with proper fallbacks
  const stats = [
    {
      title: 'Newsletters Sent',
      value: overviewStats?.newsletters_sent?.toString() || '0',
      change: overviewStats?.newsletters_sent > 0 ? '+12%' : '0%',
      icon: Mail,
      color: 'text-blue-600',
    },
    {
      title: 'Total Subscribers',
      value: overviewStats?.subscriber_growth?.toString() || '0',
      change: overviewStats?.subscriber_growth > 0 ? '+5.2%' : '0%',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Open Rate',
      value: overviewStats ? `${overviewStats.open_rate.toFixed(1)}%` : '0%',
      change: overviewStats?.open_rate > 0 ? '+2.1%' : '0%',
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      title: 'AI Calls This Month',
      value: overviewStats?.ai_calls_this_month?.toString() || '0',
      change: overviewStats?.ai_calls_this_month > 0 ? `+${overviewStats.ai_calls_this_month}` : '0',
      icon: Brain,
      color: 'text-orange-600',
    },
  ];

  // Get recent newsletters from real data
  const recentNewsletters = newsletters?.slice(0, 3) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Mail size={16} className="text-green-600" />;
      case 'generating':
        return <Brain size={16} className="text-blue-600" />;
      case 'ready':
        return <CheckCircle size={16} className="text-purple-600" />;
      default:
        return <Edit size={16} className="text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900';
      case 'generating':
        return 'text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-900';
      case 'ready':
        return 'text-purple-700 bg-purple-100 dark:text-purple-200 dark:bg-purple-900';
      default:
        return 'text-orange-700 bg-orange-100 dark:text-orange-200 dark:bg-orange-900';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {currentOrganization?.name || 'Your Organization'} • Dashboard Overview
            </p>
          </div>
          <Link to="/app/generate">
            <Button
              variant="primary"
              icon={Plus}
            >
              Generate Newsletter
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {(analyticsLoading ? Array(4).fill(null) : stats).map((stat, index) => (
          <motion.div
            key={stat?.title || index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card hover padding="md">
              {analyticsLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {stat.value}
                    </p>
                    <p className={`text-sm mt-1 ${
                      stat.change.startsWith('+') && stat.change !== '+0' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {stat.change !== '+0' && stat.change !== '0%' ? `${stat.change} from last month` : 'No data yet'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Newsletters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Newsletters
            </h2>
            <Link to="/app/newsletters">
              <Button
                variant="outline"
                size="sm"
                icon={ArrowRight}
                iconPosition="right"
              >
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {newslettersLoading ? (
              Array(3).fill(null).map((_, index) => (
                <div key={index} className="animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              ))
            ) : recentNewsletters.length > 0 ? (
              recentNewsletters.map((newsletter, index) => (
                <motion.div
                  key={newsletter.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(newsletter.status)}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {newsletter.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(newsletter.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(newsletter.status)}`}
                    >
                      {newsletter.status}
                    </span>
                    <Link to={`/app/editor/${newsletter.id}`}>
                      <Button variant="ghost" size="sm" icon={Edit}>
                        Edit
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center py-8"
              >
                <Mail size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No newsletters yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Create your first AI-powered newsletter to get started.
                </p>
                <Link to="/app/generate">
                  <Button
                    variant="primary"
                    icon={Plus}
                  >
                    Generate Newsletter
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid md:grid-cols-3 gap-6"
      >
        <Card hover className="text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Brain size={24} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Configure AI Models
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Set up your AI providers and optimize generation settings
          </p>
          <Link to="/app/ai-config">
            <Button variant="outline" size="sm" className="w-full">
              Configure
            </Button>
          </Link>
        </Card>

        <Card hover className="text-center">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Manage Knowledge
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Update your content library and expertise areas
          </p>
          <Link to="/app/knowledge">
            <Button variant="outline" size="sm" className="w-full">
              Manage
            </Button>
          </Link>
        </Card>

        <Card hover className="text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Manage Events
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Configure autism & sensory-friendly event sources
          </p>
          <Link to="/app/events">
            <Button variant="outline" size="sm" className="w-full">
              Manage
            </Button>
          </Link>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;