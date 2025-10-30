import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, TestTube, Eye, EyeOff, ExternalLink } from 'lucide-react';
import Button from '../UI/Button';
import { convertKitService } from '../../services/convertKitService';
import { useAuthStore } from '../../stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ConvertKitConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ConvertKitConfigModal: React.FC<ConvertKitConfigModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();

  const handleTest = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error('Please enter both API key and secret');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await convertKitService.testConnection(apiKey, apiSecret);
      console.log('🧪 ConvertKitModal: Test result:', result);
      setTestResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('❌ ConvertKitModal: Test error:', error);
      const errorMessage = error?.message || 'Failed to test connection. Please try again.';
      setTestResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    console.log('💾 ConvertKitModal: Starting save process...');
    
    if (!currentOrganization) {
      console.error('❌ ConvertKitModal: No organization selected');
      toast.error('No organization selected');
      return;
    }

    if (!apiKey.trim() || !apiSecret.trim()) {
      console.error('❌ ConvertKitModal: Missing API credentials');
      toast.error('Please enter both API key and secret');
      return;
    }

    setSaving(true);
    console.log('🔄 ConvertKitModal: Validation passed, proceeding with save');
    try {
      await convertKitService.saveCredentials(
        currentOrganization.id,
        apiKey,
        apiSecret
      );
      
      queryClient.invalidateQueries({ queryKey: ['convertkit-config'] });
      
      toast.success('ConvertKit credentials saved successfully!');
      
      setApiKey('');
      setApiSecret('');
      setTestResult(null);
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('❌ ConvertKitModal: Save error:', error);
      let errorMessage = 'Failed to save ConvertKit credentials';
      if (error?.message?.includes('SUPABASE_NOT_CONNECTED') || error?.message?.includes('SUPABASE_CONNECTION_ERROR')) {
        errorMessage = 'Database not connected. Please check your Supabase configuration.';
      } else if (error?.code === '23505') {
        errorMessage = 'ConvertKit configuration already exists for this organization.';
      } else if (error?.message) {
        errorMessage = `Failed to save credentials: ${error.message}`;
      } else {
        errorMessage = 'An unexpected error occurred while saving credentials.';
      }
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
                    Configure ConvertKit
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                      Getting Your API Credentials
                    </h3>
                    <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>1. Log in to your ConvertKit account</li>
                      <li>2. Go to Settings → Advanced → API Keys</li>
                      <li>3. Copy both your <strong>API Key</strong> and <strong>API Secret</strong></li>
                      <li>4. Make sure your API Secret has subscriber access permissions</li>
                    </ol>
                    <a
                      href="https://app.convertkit.com/account_settings/advanced_settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
                    >
                      Open ConvertKit Settings
                      <ExternalLink size={14} className="ml-1" />
                    </a>
                  </div>

                  <form autoComplete="off">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your ConvertKit API key"
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showApiSecret ? 'text' : 'password'}
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                          placeholder="Enter your ConvertKit API secret"
                          autoComplete="off"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiSecret(!showApiSecret)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showApiSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </form>

                  {apiKey && apiSecret && (
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
                      disabled={!apiKey.trim() || !apiSecret.trim()}
                      className="flex-1"
                    >
                      Save Credentials
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

export default ConvertKitConfigModal;