import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Settings,
  TestTube,
  MoreVertical,
} from 'lucide-react';
import Button from '../UI/Button';
import { aiService } from '../../services/aiService';
import { useQueryClient } from '@tanstack/react-query';
import { Menu } from '@headlessui/react';
import toast from 'react-hot-toast';

interface AIProvider {
  id: string;
  name: string;
  type: 'research' | 'generation';
  status: 'connected' | 'disconnected' | 'error';
  apiKey: string;
  lastTested: string | null;
  successRate: number;
  avgResponseTime: number;
  monthlyUsage: number;
  monthlyLimit: number;
  settings?: Record<string, any>;
}

interface AIModelCardProps {
  provider: AIProvider;
  onConfigure: (provider: AIProvider) => void;
  onDelete: (providerId: string) => void;
}

const AIModelCard: React.FC<AIModelCardProps> = ({ provider, onConfigure, onDelete }) => {
  const queryClient = useQueryClient();
  const [testing, setTesting] = React.useState(false);

  const getStatusIcon = () => {
    switch (provider.status) {
      case 'connected':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'error':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <AlertCircle size={16} className="text-orange-600" />;
    }
  };

  const getStatusColor = () => {
    switch (provider.status) {
      case 'connected':
        return 'text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900';
      case 'error':
        return 'text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900';
      default:
        return 'text-orange-700 bg-orange-100 dark:text-orange-200 dark:bg-orange-900';
    }
  };

  const usagePercentage = (provider.monthlyUsage / provider.monthlyLimit) * 100;

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await aiService.testProvider(provider.id);
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to test provider connection');
    } finally {
      setTesting(false);
    }
  };

  const handleConfigure = () => {
    onConfigure(provider);
  };
  
  const handleDelete = () => {
    onDelete(provider.id);
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {provider.name}
          </h3>
          {getStatusIcon()}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
          {provider.status}
        </span>
      </div>

      {provider.status === 'connected' && (
        <div className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {provider.successRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Avg Response</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {provider.avgResponseTime.toFixed(1)}s
              </p>
            </div>
          </div>

          {/* Usage Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Monthly Usage</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {provider.monthlyUsage.toLocaleString()} / {provider.monthlyLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  usagePercentage > 90 
                    ? 'bg-red-500' 
                    : usagePercentage > 75 
                    ? 'bg-orange-500' 
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Generation Model Settings */}
          {provider.type === 'generation' && provider.settings && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Model Settings
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Temperature:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {provider.settings.temperature}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Max Tokens:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {provider.settings.max_tokens}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            icon={TestTube}
            loading={testing}
            onClick={handleTest}
          >
            Test
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Settings}
            onClick={handleConfigure}
          >
            Configure
          </Button>
          
          <Menu as="div" className="relative">
            <Menu.Button className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <MoreVertical size={16} />
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleDelete()}
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
        
        {provider.lastTested && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last tested: {new Date(provider.lastTested).toLocaleDateString()}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default AIModelCard;