import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Save, Eye, EyeOff, TestTube } from 'lucide-react';
import Button from '../UI/Button';
import { aiService } from '../../services/aiService';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import OpenRouterModelSelector from './OpenRouterModelSelector';

interface AIProvider {
  id: string;
  name: string;
  type: 'research' | 'generation';
  api_key?: string;
  settings: Record<string, any>;
  is_active: boolean;
}

interface AIProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: AIProvider;
}

const AIProviderConfigModal: React.FC<AIProviderConfigModalProps> = ({ 
  isOpen, 
  onClose, 
  provider 
}) => {
  const [apiKey, setApiKey] = useState(provider.api_key || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState(provider.settings || {});
  const [isActive, setIsActive] = useState(provider.is_active);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const queryClient = useQueryClient();

  // Default settings based on provider type and name
  const getDefaultSettings = () => {
    const providerName = provider.name.toLowerCase();
    
    if (provider.type === 'generation') {
      if (providerName.includes('openai')) {
        return {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 2000,
        };
      } else if (providerName.includes('gemini')) {
        return {
          model: 'gemini-2.0-flash-exp',
          temperature: 0.7,
          max_tokens: 2000,
        };
      } else if (providerName.includes('deepseek')) {
        return {
          model: 'deepseek-coder',
          temperature: 0.7,
          max_tokens: 2000,
        };
      } else if (providerName.includes('grok')) {
        return {
          model: 'grok-beta',
          temperature: 0.7,
          max_tokens: 2000,
        };
      }
    } else if (provider.type === 'research') {
      if (providerName.includes('perplexity')) {
        return {
          model: 'llama-3.1-sonar-small-128k-online',
          temperature: 0.3,
          max_tokens: 1500,
        };
      }
    }
    
    return {
      temperature: 0.7,
      max_tokens: 1000,
    };
  };

  React.useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) {
      setSettings(getDefaultSettings());
    }
  }, [provider]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await aiService.updateProvider(provider.id, {
        api_key: apiKey,
        settings,
        is_active: isActive,
      });
      
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      toast.success('Provider configuration updated successfully!');
      onClose();
    } catch (error) {
      console.error('Provider update error:', error);
      toast.error('Failed to update provider configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    setTesting(true);
    try {
      const result = await aiService.testProvider(provider.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to test provider connection');
    } finally {
      setTesting(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
                    Configure {provider.name}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* API Key */}
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
                        name="api-key"
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

                  {/* Model Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Model Settings
                    </h3>
                    
                    {/* Model Selection */}
                    {provider.name.toLowerCase().includes('openai') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model
                        </label>
                        <select
                          value={settings.model || 'gpt-3.5-turbo'}
                          onChange={(e) => updateSetting('model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          <option value="gpt-4o-mini">GPT-4o Mini</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        </select>
                      </div>
                    )}

                    {provider.name.toLowerCase().includes('gemini') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model
                        </label>
                        <select
                          value={settings.model || 'gemini-2.0-flash-exp'}
                          onChange={(e) => updateSetting('model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Recommended)</option>
                          <option value="gemini-1.5-flash-002">Gemini 1.5 Flash-002</option>
                          <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B (Fast)</option>
                          <option value="gemini-1.5-pro-002">Gemini 1.5 Pro-002</option>
                        </select>
                      </div>
                    )}

                    {provider.name.toLowerCase().includes('openrouter') && (
                      <OpenRouterModelSelector
                        apiKey={apiKey}
                        selectedModel={settings.model || 'x-ai/grok-4-fast:free'}
                        onModelChange={(model) => updateSetting('model', model)}
                      />
                    )}

                    {provider.name.toLowerCase().includes('deepseek') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model
                        </label>
                        <select
                          value={settings.model || 'deepseek-coder'}
                          onChange={(e) => updateSetting('model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="deepseek-coder">DeepSeek Coder</option>
                          <option value="deepseek-chat">DeepSeek Chat</option>
                        </select>
                      </div>
                    )}

                    {provider.name.toLowerCase().includes('grok') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model
                        </label>
                        <select
                          value={settings.model || 'grok-beta'}
                          onChange={(e) => updateSetting('model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="grok-beta">Grok Beta</option>
                          <option value="grok-2">Grok 2</option>
                        </select>
                      </div>
                    )}

                    {/* Temperature */}
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
                        onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Focused</span>
                        <span>Creative</span>
                      </div>
                    </div>

                    {/* Max Tokens */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="4000"
                        value={settings.max_tokens || 1000}
                        onChange={(e) => updateSetting('max_tokens', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Active Status
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Enable this provider for newsletter generation
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

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
                      icon={Save}
                      loading={saving}
                      onClick={handleSave}
                      className="flex-1"
                    >
                      Save Configuration
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

export default AIProviderConfigModal;