import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Filter, Search, MoreVertical, AlertTriangle, Mail } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { Menu } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { convertKitService } from '../../services/convertKitService';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const SubscriberSegments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { currentOrganization } = useAuthStore();

  // Check ConvertKit connection status
  const { data: convertKitConfig } = useQuery({
    queryKey: ['convertkit-config', currentOrganization?.id],
    queryFn: () => currentOrganization ? convertKitService.getConfig(currentOrganization.id) : null,
    enabled: !!currentOrganization,
  });

  const convertKitConnected = convertKitConfig?.is_active || false;

  // Fetch ConvertKit subscribers
  const { data: subscribers = [], isLoading, error } = useQuery({
    queryKey: ['convertkit-subscribers', currentOrganization?.id],
    queryFn: () => currentOrganization && convertKitConnected ? convertKitService.getSubscribers(currentOrganization.id) : [],
    enabled: !!currentOrganization && convertKitConnected,
    retry: false, // Don't retry on auth errors
  });

  // Create segments from real subscriber data
  const createSegmentsFromSubscribers = (subscribers: any[]) => {
    const totalSubscribers = subscribers.length;
    
    if (totalSubscribers === 0) {
      return [{
        id: 'all',
        name: 'All Subscribers',
        description: 'Complete subscriber list',
        count: 0,
        criteria: 'All active subscribers',
        created_at: new Date().toISOString(),
        growth: '+0%',
      }];
    }

    // Group subscribers by state/location if available
    const locationGroups = subscribers.reduce((acc, subscriber) => {
      const state = subscriber.state || subscriber.fields?.state || 'Unknown';
      if (!acc[state]) {
        acc[state] = [];
      }
      acc[state].push(subscriber);
      return acc;
    }, {} as Record<string, any[]>);

    // Group by subscription date (recent vs older)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentSubscribers = subscribers.filter(sub => 
      new Date(sub.created_at) > thirtyDaysAgo
    );

    // Create segments
    const segments = [
      {
        id: 'all',
        name: 'All Subscribers',
        description: 'Complete subscriber list',
        count: totalSubscribers,
        criteria: 'All active subscribers',
        created_at: new Date().toISOString(),
        growth: '+0%',
      },
      {
        id: 'recent',
        name: 'Recent Subscribers',
        description: 'Subscribers from the last 30 days',
        count: recentSubscribers.length,
        criteria: 'Subscribed in last 30 days',
        created_at: new Date().toISOString(),
        growth: `+${recentSubscribers.length}`,
      },
    ];

    // Add location-based segments (top 3 states)
    const topLocations = Object.entries(locationGroups)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 3);

    topLocations.forEach(([location, locationSubscribers]) => {
      if (locationSubscribers.length > 1 && location !== 'Unknown') {
        segments.push({
          id: `location-${location.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${location} Subscribers`,
          description: `Subscribers from ${location}`,
          count: locationSubscribers.length,
          criteria: `Location: ${location}`,
          created_at: new Date().toISOString(),
          growth: '+0%',
        });
      }
    });

    return segments;
  };

  const segments = convertKitConnected ? createSegmentsFromSubscribers(subscribers) : [
    {
      id: 'all',
      name: 'All Subscribers',
      description: 'Complete subscriber list',
      count: 0,
      criteria: 'All active subscribers',
      created_at: new Date().toISOString(),
      growth: '+0%',
    },
  ];

  const filteredSegments = segments.filter(segment =>
    segment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    segment.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!convertKitConnected) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            ConvertKit Not Connected
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your ConvertKit account to view and manage subscriber segments.
          </p>
          <Button
            variant="primary"
            onClick={() => toast.info('Please go to the Distribution tab and click "Configure ConvertKit"')}
          >
            Configure ConvertKit
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size="large" />
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                Loading subscriber segments from ConvertKit...
              </p>
            </div>
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
            Failed to Load Subscribers
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            There was an error loading your ConvertKit subscribers. Please check your API credentials.
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search segments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <Button variant="primary" icon={Plus}>
            Create Segment
          </Button>
        </div>
      </Card>

      {/* Segments List */}
      <div className="space-y-4">
        {filteredSegments.length > 0 ? (
          filteredSegments.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card hover>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {segment.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {segment.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Criteria: {segment.criteria}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {segment.count.toLocaleString()}
                    </p>
                    {segment.growth !== '+0%' && (
                      <p className="text-sm text-green-600">
                        {segment.growth} this month
                      </p>
                    )}
                  </div>

                  <Menu as="div" className="relative">
                    <Menu.Button className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <MoreVertical size={16} />
                    </Menu.Button>
                    <Menu.Items className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                              } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                            >
                              Edit
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                              } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                            >
                              Export
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
                              } block w-full text-left px-4 py-2 text-sm text-red-600`}
                            >
                              Delete
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Menu>
                </div>
              </div>
            </Card>
          </motion.div>
          ))
        ) : (
          <Card className="text-center">
            <Mail size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No segments found' : 'No subscribers yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms.' 
                : 'Start building your subscriber list in ConvertKit to see segments here.'
              }
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                onClick={() => window.open('https://app.convertkit.com/subscribers', '_blank')}
              >
                Manage Subscribers in ConvertKit
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default SubscriberSegments;