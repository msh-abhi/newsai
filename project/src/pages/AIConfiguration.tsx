import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, CreditCard as Edit, Settings, TestTube, CheckCircle, AlertCircle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import AIModelCard from '../components/AI/AIModelCard';
import AIProviderModal from '../components/AI/AIProviderModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { aiService } from '../services/aiService';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const AIConfiguration: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'research' | 'generation'>('research');
  const [editingProvider, setEditingProvider] = useState<any>(null); // FIX: Keep only one useState declaration
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch research providers
  const { data: researchProviders = [], isLoading: researchLoading, error: researchError, refetch: refetchResearch } = useQuery({
    queryKey: ['ai-providers', 'research', currentOrganization?.id],
    queryFn: () => currentOrganization ? aiService.getProviders(currentOrganization.id, 'research') : [],
    enabled: !!currentOrganization,
  });

  // Fetch generation providers
  const { data: generationProviders = [], isLoading: generationLoading, error: generationError, refetch: refetchGeneration } = useQuery({
    queryKey: ['ai-providers', 'generation', currentOrganization?.id],
    queryFn: () => currentOrganization ? aiService.getProviders(currentOrganization.id, 'generation') : [],
    enabled: !!currentOrganization,
  });

  // Transform providers to match expected format
  const transformProvider = (provider: any) => ({
    ...provider,
    status: provider.is_active && provider.api_key ? 'connected' : 'disconnected',
    apiKey: provider.api_key ? `•••••••••••••${provider.api_key.slice(-4)}` : '',
    lastTested: provider.last_tested_at,
    successRate: provider.test_success_rate || 0,
    avgResponseTime: 2.5, // TODO: Track actual response times
    monthlyUsage: provider.monthly_usage || 0,
    monthlyLimit: provider.monthly_limit || 1000,
  });

  // FIX: Consolidated and simplified openModal function
  const openModal = (type: 'research' | 'generation', provider: any = null) => {
    setModalType(type);
    setEditingProvider(provider); // Set the provider for editing or null for new creation
    setShowModal(true);
  };

  const handleModalClose = () => {
      setShowModal(false);
      setEditingProvider(null);
      // Invalidate queries to refresh the list after save/close
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
  };
  
  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this AI provider? This action cannot be undone.')) {
      return;
    }

    try {
      await aiService.deleteProvider(providerId);
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      toast.success('AI provider deleted successfully!');
    } catch (error) {
      console.error('Delete provider error:', error);
      toast.error('Failed to delete AI provider');
    }
  };
  
  if (!currentOrganization) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <AlertCircle size={48} className="mx-auto text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Organization Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please create or select an organization to configure AI providers.
          </p>
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
              AI Configuration
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage your AI models and optimize newsletter generation
            </p>
          </div>
          <Button
            variant="primary"
            icon={TestTube}
            onClick={() => {/* TODO: Run full system test */}}
          >
            Test All Models
          </Button>
        </div>
      </motion.div>

      {/* Research AI Models */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Search size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Research AI Models
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  APIs for web research and event discovery
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => openModal('research')}
            >
              Add Provider
            </Button>
          </div>

          {researchLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array(2).fill(null).map((_, index) => (
                <div key={index} className="animate-pulse bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                  <div className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          ) : researchError ? (
            <div className="text-center py-8">
              <AlertCircle size={32} className="mx-auto text-red-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                Failed to load research providers. Please check your connection.
              </p>
            </div>
          ) : researchProviders.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {researchProviders.map((provider) => (
                <AIModelCard 
                  key={provider.id} 
                  provider={transformProvider(provider)} 
                  onConfigure={() => openModal('research', provider)}
                  onDelete={handleDeleteProvider}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Search size={32} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No research providers configured yet.
              </p>
              <Button
                variant="outline"
                icon={Plus}
                onClick={() => openModal('research')}
              >
                Add Research Provider
              </Button>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Content Generation Models */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Edit size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Content Generation Models
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  AI models for creating newsletter content
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => openModal('generation')}
            >
              Add Provider
            </Button>
          </div>

          {generationLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array(2).fill(null).map((_, index) => (
                <div key={index} className="animate-pulse bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                  <div className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          ) : generationError ? (
            <div className="text-center py-8">
              <AlertCircle size={32} className="mx-auto text-red-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                Failed to load generation providers. Please check your connection.
              </p>
            </div>
          ) : generationProviders.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {generationProviders.map((provider) => (
                <AIModelCard 
                  key={provider.id} 
                  provider={transformProvider(provider)} 
                  onConfigure={() => openModal('generation', provider)}
                  onDelete={handleDeleteProvider}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Edit size={32} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No generation providers configured yet.
              </p>
              <Button
                variant="outline"
                icon={Plus}
                onClick={() => openModal('generation')}
              >
                Add Generation Provider
              </Button>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Fallback Chain Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Settings size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Fallback Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Order your providers for automatic fallback when one fails
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Research Provider Order
              </h3>
              {researchProviders.length > 0 ? (
                <div className="space-y-2">
                  {researchProviders.map((provider, index) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {index + 1}.
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {provider.name}
                        </span>
                        {provider.is_active && provider.apiKey ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <AlertCircle size={16} className="text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No research providers configured
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Generation Provider Order
              </h3>
              {generationProviders.length > 0 ? (
                <div className="space-y-2">
                  {generationProviders.map((provider, index) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {index + 1}.
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {provider.name}
                        </span>
                        {provider.is_active && provider.apiKey ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <AlertCircle size={16} className="text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No generation providers configured
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Modal */}
      <AIProviderModal
        isOpen={showModal}
        onClose={handleModalClose}
        type={modalType}
        initialProvider={editingProvider}
      />
    </div>
  );
};

export default AIConfiguration;