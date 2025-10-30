import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TestTube,
  Settings,
  ExternalLink,
  MoreVertical,
  MapPin,
  Tag,
  Calendar,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Menu } from '@headlessui/react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { useEvents } from '../../hooks/useEvents';
import { useAuthStore } from '../../stores/authStore';
import { EventSource } from '../../services/eventService';

interface EventSourceCardProps {
  source: EventSource;
}

const EventSourceCard: React.FC<EventSourceCardProps> = ({ source }) => {
  const { currentOrganization } = useAuthStore();
  const { testEventSource, deleteEventSource, updateEventSource } = useEvents();

  const getStatusIcon = () => {
    if (!source.performance_metrics?.last_attempt) {
      return <AlertTriangle size={16} className="text-orange-600" />;
    }
    
    if (source.performance_metrics.last_success) {
      return <CheckCircle size={16} className="text-green-600" />;
    }
    
    return <XCircle size={16} className="text-red-600" />;
  };

  const getStatusColor = () => {
    if (!source.performance_metrics?.last_attempt) {
      return 'text-orange-700 bg-orange-100 dark:text-orange-200 dark:bg-orange-900';
    }
    
    if (source.performance_metrics.last_success) {
      return 'text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900';
    }
    
    return 'text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900';
  };

  const getStatusText = () => {
    if (!source.performance_metrics?.last_attempt) {
      return 'Not Tested';
    }
    
    if (source.performance_metrics.last_success) {
      return 'Connected';
    }
    
    return 'Error';
  };

  const handleTest = async () => {
    if (!currentOrganization) return;
    
    try {
      await testEventSource.mutateAsync({
        organizationId: currentOrganization.id,
        sourceId: source.id,
      });
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateEventSource.mutateAsync({
        id: source.id,
        updates: { is_active: !source.is_active },
      });
    } catch (error) {
      console.error('Toggle active failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${source.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteEventSource.mutateAsync(source.id);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <Card hover>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${source.is_active ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <Calendar size={20} className={source.is_active ? 'text-blue-600' : 'text-gray-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {source.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon()}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {!source.is_active && (
                <span className="px-2 py-1 text-xs font-medium rounded-full text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-600">
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        <Menu as="div" className="relative">
          <Menu.Button className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            <MoreVertical size={16} />
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleToggleActive}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                  >
                    {source.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => window.open(source.url, '_blank')}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                  >
                    Visit Website
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleDelete}
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

      {/* Source Details */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <ExternalLink size={14} />
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors truncate"
          >
            {source.url}
          </a>
        </div>

        {/* Keywords */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Tag size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter Keywords
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {source.keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <MapPin size={14} />
          <span>
            {source.location.city}, {source.location.state} ({source.location.radius} mile radius)
          </span>
        </div>

        {/* Performance Metrics */}
        {source.performance_metrics?.last_attempt && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Last Scraped:</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {source.last_scraped_at 
                    ? new Date(source.last_scraped_at).toLocaleDateString()
                    : 'Never'
                  }
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Events Found:</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {source.performance_metrics.events_found || 0}
                </div>
              </div>
            </div>
            
            {source.performance_metrics.last_error && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                <strong>Last Error:</strong> {source.performance_metrics.last_error}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            icon={TestTube}
            loading={testEventSource.isPending}
            onClick={handleTest}
          >
            Test
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Settings}
            onClick={() => {/* TODO: Implement edit modal */}}
          >
            Configure
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={ExternalLink}
            onClick={() => window.open(source.url, '_blank')}
          >
            Visit
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EventSourceCard;