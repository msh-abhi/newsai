import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  ExternalLink,
  Star,
  Clock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Event } from '../../services/eventService';

interface RecentEventsPanelProps {
  events: Event[];
  isLoading: boolean;
  onRefresh: () => void;
}

const RecentEventsPanel: React.FC<RecentEventsPanelProps> = ({ 
  events, 
  isLoading, 
  onRefresh 
}) => {
  const upcomingEvents = events
    .filter(event => new Date(event.date_start) > new Date())
    .slice(0, 10);

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:text-green-200 dark:bg-green-900';
    if (score >= 60) return 'text-blue-600 bg-blue-100 dark:text-blue-200 dark:bg-blue-900';
    if (score >= 40) return 'text-orange-600 bg-orange-100 dark:text-orange-200 dark:bg-orange-900';
    return 'text-gray-600 bg-gray-100 dark:text-gray-200 dark:bg-gray-900';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Calendar size={20} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upcoming Events
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Recent autism & sensory-friendly events
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCw}
          onClick={onRefresh}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="text-gray-600 dark:text-gray-300 mt-4">
              Loading events...
            </p>
          </div>
        </div>
      ) : upcomingEvents.length > 0 ? (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {upcomingEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                  {event.title}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRelevanceColor(event.relevance_score)}`}>
                  {event.relevance_score}%
                </span>
              </div>

              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center space-x-2">
                  <Clock size={12} />
                  <span>{formatDate(event.date_start)}</span>
                </div>
                
                {event.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin size={12} />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Star size={12} />
                  <span className="text-blue-600 dark:text-blue-400">{event.source_name}</span>
                </div>

                {event.keywords_matched.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {event.keywords_matched.slice(0, 3).map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                    {event.keywords_matched.length > 3 && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded">
                        +{event.keywords_matched.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {event.url && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View Event
                    <ExternalLink size={10} className="ml-1" />
                  </a>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertTriangle size={32} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Events Found
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            No upcoming events have been scraped yet. Try running the scraper or adding more event sources.
          </p>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={onRefresh}
          >
            Check Again
          </Button>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {upcomingEvents.length} of {events.length} total events
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentEventsPanel;