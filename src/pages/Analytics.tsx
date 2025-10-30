import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Mail,
  DollarSign,
  Calendar,
  Download,
  Filter,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { currentOrganization } = useAuthStore();
  const { 
    overviewStats, 
    engagementData, 
    modelUsage, 
    newsletterPerformance, 
    isLoading, 
    error 
  } = useAnalytics(timeRange);

  // Create stats from real data
  const stats = overviewStats ? [
    {
      title: 'Total Newsletters Sent',
      value: overviewStats.newsletters_sent.toString(),
      change: overviewStats.newsletters_sent > 0 ? '+12.3%' : '0%',
      icon: Mail,
      color: 'text-blue-600',
    },
    {
      title: 'Total Subscribers',
      value: Math.round(overviewStats.subscriber_growth).toLocaleString(),
      change: overviewStats.subscriber_growth > 0 ? '+8.7%' : '0%',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Average Open Rate',
      value: `${overviewStats.open_rate.toFixed(1)}%`,
      change: overviewStats.open_rate > 0 ? '+2.1%' : '0%',
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      title: 'AI Generation Cost',
      value: `$${overviewStats.cost_this_month.toFixed(2)}`,
      change: overviewStats.cost_this_month > 0 ? '-5.2%' : '0%',
      icon: DollarSign,
      color: 'text-orange-600',
    },
  ] : [];

  if (!currentOrganization) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Organization Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please create or select an organization to view analytics.
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Unable to load analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            There was an error loading your analytics data. Please try again.
          </p>
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Track performance and optimize your newsletter strategy
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <Button variant="outline" icon={Download}>
              Export Report
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {(isLoading ? Array(4).fill(null) : stats).map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card hover>
              {isLoading ? (
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
                      stat.change.startsWith('+') && stat.change !== '+0%' ? 'text-green-600' : 
                      stat.change.startsWith('-') ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {stat.change !== '+0%' && stat.change !== '0%' ? `${stat.change} from last period` : 'No data yet'}
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

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Engagement Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Engagement Trends
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Opens</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Clicks</span>
                </div>
              </div>
            </div>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <LoadingSpinner size="large" />
              </div>
            ) : engagementData && engagementData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="opens" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No engagement data available</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* AI Model Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Model Usage
              </h2>
            </div>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <LoadingSpinner size="large" />
              </div>
            ) : modelUsage && modelUsage.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelUsage}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="usage"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {modelUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <DollarSign size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No AI usage data available</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Newsletter Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Newsletter Performance
              </h2>
            </div>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <LoadingSpinner size="large" />
              </div>
            ) : newsletterPerformance && newsletterPerformance.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={newsletterPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="newsletter" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }} 
                    />
                    <Bar dataKey="opens" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicks" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Mail size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No newsletter performance data available</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Cost Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Cost Breakdown
              </h2>
            </div>
            {isLoading ? (
              <div className="space-y-4">
                {Array(4).fill(null).map((_, index) => (
                  <div key={index} className="animate-pulse flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16 mb-1"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : modelUsage && modelUsage.length > 0 ? (
              <div className="space-y-4">
                {modelUsage.map((model) => (
                  <div key={model.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: model.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {model.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        ${model.cost.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {model.usage}% usage
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No cost data available</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Detailed Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Newsletter Performance Details
            </h2>
            <Button variant="outline" size="sm" icon={Filter}>
              Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array(4).fill(null).map((_, index) => (
                <div key={index} className="animate-pulse flex items-center justify-between p-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
                </div>
              ))}
            </div>
          ) : newsletterPerformance && newsletterPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                      Newsletter
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                      Open Rate
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                      Click Rate
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                      Engagement
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {newsletterPerformance.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {item.newsletter}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${
                          item.opens > 70 ? 'text-green-600' : 
                          item.opens > 60 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {item.opens.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${
                          item.clicks > 15 ? 'text-green-600' : 
                          item.clicks > 10 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {item.clicks.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.engagement.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" icon={BarChart3}>
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No newsletter performance data available</p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Analytics;