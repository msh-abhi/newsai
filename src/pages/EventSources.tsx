import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Clock,
  Target,
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import EventSourceCard from '../components/Events/EventSourceCard';
import AddEventSourceModal from '../components/Events/AddEventSourceModal';
import { useEvents } from '../hooks/useEvents';
import { useAuthStore } from '../stores/authStore';
import { eventService } from '../services/eventService';

const EventSources: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrapingFilters, setScrapingFilters] = useState({ filter_enabled: true });
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const { currentOrganization } = useAuthStore();
  
  const {
    eventSources,
    events,
    sourcesLoading,
    sourcesError,
    eventsLoading,
    triggerScraping,
    createMiamiSources,
    refetchSources,
    refetchEvents,
  } = useEvents();

  // FIX: Implemented safety checks for null/undefined properties to prevent runtime crash
  const filteredSources = eventSources.filter(source =>
    (source.name && source.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (source.url && source.url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTriggerScraping = async () => {
    if (!currentOrganization) return;

    try {
      await triggerScraping.mutateAsync({
        organizationId: currentOrganization.id,
        forceRefresh,
      });
      // Refresh both sources and events after scraping
      setTimeout(() => {
        refetchSources();
        refetchEvents();
      }, 2000);
    } catch (error) {
      console.error('Manual scraping failed:', error);
    }
  };

  const handleScheduledScraping = async () => {
    if (!currentOrganization) return;

    try {
      // This would trigger the scheduled scraper for all organizations
      // For now, we'll just trigger it for the current organization
      await triggerScraping.mutateAsync({
        organizationId: currentOrganization.id,
      });
      // Refresh both sources and events after scraping
      setTimeout(() => {
        refetchSources();
        refetchEvents();
      }, 2000);
    } catch (error) {
      console.error('Scheduled scraping failed:', error);
    }
  };

  const handleCreateMiamiSources = async () => {
    if (!currentOrganization) return;

    try {
      await createMiamiSources.mutateAsync(currentOrganization.id);
      refetchSources(); // Refresh the list immediately after creation
    } catch (error) {
      console.error('Failed to create Miami sources:', error);
      // Error handling is done through the UI state
    }
  };

  const stats = [
    {
      title: 'Active Sources',
      value: eventSources.filter(s => s.is_active).length.toString(),
      icon: Calendar,
      color: 'text-blue-600',
    },
    {
      title: 'Total Events',
      value: events.length.toString(),
      icon: Clock,
      color: 'text-green-600',
    },
    {
      title: 'Avg Relevance',
      value: events.length > 0 ? `${Math.round(events.reduce((sum, e) => sum + e.relevance_score, 0) / events.length)}%` : '0%',
      icon: Target,
      color: 'text-purple-600',
    },
    {
      title: 'Last Scraped',
      value: eventSources.length > 0 && eventSources.some(s => s.last_scraped_at)
        ? new Date(Math.max(...eventSources.filter(s => s.last_scraped_at).map(s => new Date(s.last_scraped_at!).getTime()))).toLocaleDateString()
        : 'Never',
      icon: RefreshCw,
      color: 'text-orange-600',
    },
  ];

  if (!currentOrganization) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Organization Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please create or select an organization to manage event sources.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Event Sources
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage autism and sensory-friendly event sources for newsletter content
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Scraping Filter Toggle */}
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter Events:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={scrapingFilters.filter_enabled}
                  onChange={async (e) => {
                    if (!currentOrganization?.id) return;
                    setFiltersLoading(true);
                    try {
                      const updated = await eventService.createOrUpdateScrapingFilters(
                        currentOrganization.id,
                        { filter_enabled: e.target.checked }
                      );
                      setScrapingFilters(updated);
                    } catch (error) {
                      console.error('Error updating scraping filters:', error);
                    } finally {
                      setFiltersLoading(false);
                    }
                  }}
                  disabled={filtersLoading}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {scrapingFilters.filter_enabled ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>

            <Button
              variant="secondary"
              icon={MapPin}
              loading={createMiamiSources.isPending}
              onClick={handleCreateMiamiSources}
              disabled={eventSources.length > 0}
            >
              Setup Miami Sources
            </Button>
            {/* Force Refresh Toggle */}
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Force Refresh:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceRefresh}
                  onChange={(e) => setForceRefresh(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {forceRefresh ? 'ON' : 'OFF'}
                </span>
              </label>
            </div>

            <Button
              variant="outline"
              icon={RefreshCw}
              loading={triggerScraping.isPending}
              onClick={handleTriggerScraping}
              disabled={eventSources.length === 0}
            >
              {forceRefresh ? 'Force Scrape' : 'Scrape Now'}
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setShowAddModal(true)}
            >
              Add Source
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

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search event sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {eventSources.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Quick Start:</strong> Click "Setup Miami Sources" to automatically configure
                  autism and sensory-friendly event sources for the Miami area.
                </p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Event Sources List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {sourcesLoading ? (
          <Card className="text-center py-12">
            <LoadingSpinner size="large" />
            <p className="text-gray-600 dark:text-gray-300 mt-4">Loading event sources...</p>
          </Card>
        ) : sourcesError ? (
          <Card className="text-center">
            <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Failed to Load Event Sources
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              There was an error fetching your event sources.
            </p>
            <Button onClick={() => refetchSources()} icon={RefreshCw}>
              Retry
            </Button>
          </Card>
        ) : filteredSources.length > 0 ? (
          <div className="space-y-4">
            {filteredSources.map((source, index) => (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <EventSourceCard source={source} />
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No sources found' : 'No event sources configured'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'Add event sources to automatically collect autism and sensory-friendly events for your newsletters.'
              }
            </p>
            {!searchQuery && (
              <div className="flex space-x-3 justify-center">
                <Button
                  variant="outline"
                  icon={MapPin}
                  onClick={handleCreateMiamiSources}
                  loading={createMiamiSources.isPending}
                >
                  Setup Miami Sources
                </Button>
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => setShowAddModal(true)}
                >
                  Add Custom Source
                </Button>
              </div>
            )}
          </Card>
        )}
      </motion.div>

      {/* Add Event Source Modal */}
      <AddEventSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          refetchSources();
        }}
      />
    </div>
  );
};

export default EventSources;
