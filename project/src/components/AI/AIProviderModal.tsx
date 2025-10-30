import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, TestTube, Eye, EyeOff } from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { aiService } from '../../services/aiService';
import { useAuthStore } from '../../stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { AI_PROVIDERS } from '../../constants';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase'; // Make sure this is imported
import OpenRouterModelSelector from './OpenRouterModelSelector';

interface AIProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'research' | 'generation';
  initialProvider?: any;
}

const AIProviderModal: React.FC<AIProviderModalProps> = ({ isOpen, onClose, type, initialProvider }) => {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false); // Fix: The missing state variable
  const [settings, setSettings] = useState<Record<string, any>>({});
  
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();

  const providers = type === 'research' ? AI_PROVIDERS.research : AI_PROVIDERS.generation;

  // Initialize form with existing provider data
  React.useEffect(() => {
    if (initialProvider) {
      const providerConfig = providers.find(p => p.name === initialProvider.name);
      setSelectedProvider(providerConfig?.id || '');
      setApiKey(initialProvider.api_key || '');
      setSettings(initialProvider.settings || {});
    } else {
      // Reset form for new provider
      setSelectedProvider('');
      setApiKey('');
      setSettings({});
      setTestResult(null);
    }
  }, [initialProvider, providers]);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      if (initialProvider) {
        // Test existing provider
        const result = await aiService.testProvider(initialProvider.id);
        setTestResult(result);
      } else {
        // Create a temporary provider for testing
        const tempProvider = {
          name: providers.find(p => p.id === selectedProvider)?.name || 'Unknown',
          type,
          api_key: apiKey,
          settings,
          organization_id: currentOrganization?.id || '',
        };

        // Save temporarily to test
        const savedProvider = await aiService.saveProvider(tempProvider);
        const result = await aiService.testProvider(savedProvider.id);
        
        setTestResult(result);
        
        if (!result.success) {
          // Remove the failed provider
          await supabase.from('ai_providers').delete().eq('id', savedProvider.id);
        }
      }
      
    } catch (error) {
      console.error('Test error:', error);
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please try again.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    console.log('💾 AIProviderModal: Starting save process...');
    
    if (!currentOrganization) {
      console.error('❌ AIProviderModal: No organization selected');
      toast.error('No organization selected');
      return;
    }

    if (!selectedProvider || !apiKey.trim()) {
      console.error('❌ AIProviderModal: Missing provider or API key');
      toast.error('Please select a provider and enter an API key');
      return;
    }

    console.log('🔄 AIProviderModal: Validation passed, proceeding with save');
    
    setSaving(true);
    try {
      const providerData = providers.find(p => p.id === selectedProvider);
      if (!providerData) {
        console.error('❌ AIProviderModal: Provider data not found for:', selectedProvider);
        throw new Error('Provider not found');
      }

      console.log('📋 AIProviderModal: Saving provider with data:', {
        name: providerData.name,
        type,
        organization_id: currentOrganization.id,
        hasApiKey: !!apiKey,
        isUpdate: !!initialProvider,
      });

      if (initialProvider) {
        // Update existing provider
        await aiService.updateProvider(initialProvider.id, {
          name: providerData.name,
          api_key: apiKey,
          settings: {
            ...settings,
            ...(type === 'generation' ? { temperature: 0.7, max_tokens: 2000 } : {}),
          },
          is_active: true,
        });
        toast.success('AI provider updated successfully!');
      } else {
        // Create new provider
        await aiService.saveProvider({
          name: providerData.name,
          type,
          api_key: apiKey,
          organization_id: currentOrganization.id,
          settings: {
            ...settings,
            ...(type === 'generation' ? { temperature: 0.7, max_tokens: 2000 } : {}),
          },
          is_active: true,
          monthly_limit: type === 'research' ? 5000 : 100000,
        });
        toast.success('AI provider added successfully!');
      }

      console.log('✅ AIProviderModal: Provider saved successfully');

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      
      // Reset form
      setSelectedProvider('');
      setApiKey('');
      setSettings({});
      setTestResult(null);
      onClose();
    } catch (error) {
      console.error('AI Provider save error:', error);
      let errorMessage = 'Failed to save AI provider';
      
      if (error?.code === 'SUPABASE_NOT_CONNECTED' || error?.code === 'SUPABASE_CONNECTION_ERROR') {
        errorMessage = 'Database not connected. Please connect to Supabase first.';
      } else if (error?.code === '23505') {
        errorMessage = 'A provider with this name already exists for your organization.';
      } else if (error?.code === '42P01') {
        errorMessage = 'Database tables not found. Please connect to Supabase first.';
      } else if (error?.message?.includes('JWT')) {
        errorMessage = 'Authentication expired. Please sign out and sign back in.';
      } else if (error?.message?.includes('relation') && error?.message?.includes('does not exist')) {
        errorMessage = 'Database tables not found. Please connect to Supabase first.';
      } else if (error?.message) {
        errorMessage = `Failed to save provider: ${error.message}`;
      } else {
        errorMessage = 'An unexpected error occurred while saving the provider.';
      }
      
      console.error('Detailed AI Provider save error:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    {initialProvider ? 'Configure' : 'Add'} {type === 'research' ? 'Research' : 'Generation'} Provider
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Provider
                    </label>
                    <div className="space-y-2">
                      {providers.map((provider) => (
                        <label
                          key={provider.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedProvider === provider.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="provider"
                            value={provider.id}
                            checked={selectedProvider === provider.id}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                            disabled={!!initialProvider}
                            className="sr-only"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {provider.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {provider.description}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              <a href={provider.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {provider.website}
                              </a>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Model Configuration for OpenRouter */}
                  {selectedProvider === 'openrouter' && (
                    <div>
                      <OpenRouterModelSelector
                        apiKey={apiKey}
                        selectedModel={settings.model || 'x-ai/grok-4-fast:free'}
                        onModelChange={(model) => setSettings(prev => ({ ...prev, model }))}
                      />
                    </div>
                  )}

                  {/* Temperature Setting for Generation Providers */}
                  {type === 'generation' && selectedProvider && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Temperature: {settings.temperature || 0.7}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.temperature || 0.7}
                        onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Focused</span>
                        <span>Creative</span>
                      </div>
                    </div>
                  )}

                  {/* Max Tokens Setting */}
                  {selectedProvider && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="4000"
                        value={settings.max_tokens || (type === 'generation' ? 2000 : 1000)}
                        onChange={(e) => setSettings(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )}

                  {/* API Key Input */}
                  {selectedProvider && (
                    <form autoComplete="off">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                            autoComplete="off"
                            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Test Connection */}
                  {apiKey && (
                    <div>
                      <Button
                        variant="outline"
                        icon={TestTube}
                        loading={testing}
                        onClick={handleTest}
                        className="w-full"
                      >
                        Test Connection
                      </Button>
                      
                      {testResult && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          testResult.success 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200'
                        }`}>
                          {testResult.message}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      loading={saving}
                      onClick={handleSave}
                      disabled={!selectedProvider || !apiKey.trim()}
                      className="flex-1"
                    >
                      {initialProvider ? 'Update Provider' : 'Save Provider'}
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AIProviderModal;