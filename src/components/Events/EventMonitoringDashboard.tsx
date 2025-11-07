import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { eventService } from '../../services/eventService';
import { useAuthStore } from '../../stores/authStore';

interface MonitoringStats {
  totalSources: number;
  activeSources: number;
  totalEvents: number;
  lastScraped: string | null;
  successRate: number;
  recentActivity: Array<{
    source_name: string;
    events_found: number;
    last_attempt: string;
    success: boolean;
  }>;
}

const EventMonitoringDashboard: React.FC = () => {
  const { currentOrganization } = useAuthStore();
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadStats();
    }
  }, [currentOrganization?.id]);

  const loadStats = async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      const [sources, events] = await Promise.all([
        eventService.getEventSources(currentOrganization.id),
        eventService.getEvents(currentOrganization.id, 1000)
      ]);

      const activeSources = sources.filter(s => s.is_active);
      const lastScraped = sources.length > 0
        ? sources
            .filter(s => s.last_scraped_at)
            .sort((a, b) => new Date(b.last_scraped_at!).getTime() - new Date(a.last_scraped_at!).getTime())[0]
            ?.last_scraped_at || null
        : null;

      const successRate = sources.length > 0
        ? Math.round((sources.filter(s => s.performance_metrics?.last_success).length / sources.length) * 100)
        : 0;

      const recentActivity = sources
        .filter(s => s.last_scraped_at)
        .sort((a, b) => new Date(b.last_scraped_at!).getTime() - new Date(a.last_scraped_at!).getTime())
        .slice(0, 5)
        .map(s => ({
          source_name: s.name,
          events_found: s.performance_metrics?.events_found || 0,
          last_attempt: s.last_scraped_at!,
          success: s.performance_metrics?.last_success || false
        }));

      setStats({
        totalSources: sources.length,
        activeSources: activeSources.length,
        totalEvents: events.length,
        lastScraped,
        successRate,
        recentActivity
      });
    } catch (error) {
      console.error('Error loading monitoring stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!currentOrganization) {
    return (
      <Card className="text-center">
        <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No Organization Selected</h3>
        <p className="text-gray-600">Please select an organization to view monitoring stats.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Event Scraping Monitor</h2>
          <p className="text-gray-600 mt-1">Track the performance of your event sources</p>
        </div>
        <Button
          variant="outline"
          icon={RefreshCw}
          loading={refreshing}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sources</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalSources}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sources</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeSources}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalEvents}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className={`text-3xl font-bold ${stats.successRate >= 80 ? 'text-green-600' : stats.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {stats.successRate}%
                  </p>
                </div>
                <div className={`p-2 rounded-full ${stats.successRate >= 80 ? 'bg-green-100' : stats.successRate >= 50 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  {stats.successRate >= 80 ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scraping Activity</h3>
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${activity.success ? 'bg-green-100' : 'bg-red-100'}`}>
                        {activity.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.source_name}</p>
                        <p className="text-sm text-gray-600">
                          {activity.events_found} events found • {formatTimeAgo(activity.last_attempt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{activity.events_found}</p>
                      <p className="text-xs text-gray-600">events</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No recent scraping activity</p>
                <p className="text-sm mt-1">Sources haven't been scraped yet</p>
              </div>
            )}
          </Card>

          {/* Last Scraped Info */}
          {stats.lastScraped && (
            <Card className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Scraped</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(stats.lastScraped).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{formatTimeAgo(stats.lastScraped)}</p>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="text-center py-12">
          <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Unable to Load Stats</h3>
          <p className="text-gray-600 mb-4">There was an error loading the monitoring data.</p>
          <Button onClick={loadStats} icon={RefreshCw}>
            Try Again
          </Button>
        </Card>
      )}
    </div>
  );
};

export default EventMonitoringDashboard;
