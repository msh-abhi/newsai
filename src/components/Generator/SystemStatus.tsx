import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wifi,
  Database,
  Cpu,
  Clock,
  Zap,
  FileText,
  Settings,
} from 'lucide-react';
import Card from '../UI/Card';

interface SystemStatusProps {
  researchProviders: any[];
  generationProviders: any[];
  knowledgeItems: any[];
  eventSources: any[];
  isGenerating?: boolean;
  progress?: number;
  currentPhase?: string;
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  researchProviders,
  generationProviders,
  knowledgeItems,
  eventSources,
  isGenerating = false,
  progress = 0,
  currentPhase = '',
}) => {
  const getStatusIcon = (count: number, type: 'success' | 'warning' | 'error') => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-orange-600`} />;
      case 'error':
        return <XCircle className={`${iconClass} text-red-600`} />;
      default:
        return <CheckCircle className={`${iconClass} text-gray-400`} />;
    }
  };

  const getStatusColor = (type: 'success' | 'warning' | 'error' | 'neutral') => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'neutral':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const aiModelsCount = researchProviders.length + generationProviders.length;
  const aiModelsStatus = aiModelsCount > 0 ? 'success' : 'error';
  const knowledgeStatus = knowledgeItems.length > 0 ? 'success' : 'warning';
  const eventsStatus = eventSources.length > 0 ? 'success' : 'warning';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <Wifi size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                System Status
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Real-time system health and capabilities
              </p>
            </div>
          </div>
          
          {isGenerating && (
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  {progress}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {currentPhase}
                </div>
              </div>
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* AI Models Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`p-3 rounded-lg border-2 ${getStatusColor(aiModelsStatus)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Cpu size={14} className="text-gray-600" />
                </div>
                {getStatusIcon(aiModelsCount, aiModelsStatus)}
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">
                AI Models
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                {aiModelsCount} models
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {generationProviders.length > 0 && researchProviders.length > 0
                  ? 'Full'
                  : generationProviders.length > 0
                  ? 'Generation'
                  : researchProviders.length > 0
                  ? 'Research'
                  : 'None'
                }
              </div>
            </motion.div>

            {/* Knowledge Base Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`p-3 rounded-lg border-2 ${getStatusColor(knowledgeStatus)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Database size={14} className="text-gray-600" />
                </div>
                {getStatusIcon(knowledgeItems.length, knowledgeStatus)}
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">
                Knowledge
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                {knowledgeItems.length} items
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {knowledgeItems.length > 0
                  ? 'Ready'
                  : 'Empty'
                }
              </div>
            </motion.div>

            {/* Event Sources Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={`p-3 rounded-lg border-2 ${getStatusColor(eventsStatus)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Zap size={14} className="text-gray-600" />
                </div>
                {getStatusIcon(eventSources.length, eventsStatus)}
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">
                Events
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                {eventSources.length} sources
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {eventSources.length > 0
                  ? 'Active'
                  : 'None'
                }
              </div>
            </motion.div>

            {/* System Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={`p-3 rounded-lg border-2 ${getStatusColor('neutral')}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Clock size={14} className="text-gray-600" />
                </div>
                <CheckCircle size={14} className="text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">
                Health
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                {isGenerating ? 'Active' : 'Ready'}
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                OK
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-1.5">
              <button className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                <Settings size={10} className="mr-1" />
                AI Config
              </button>
              <button className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors">
                <FileText size={10} className="mr-1" />
                Add Knowledge
              </button>
              <button className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                <Wifi size={10} className="mr-1" />
                Events
              </button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default SystemStatus;