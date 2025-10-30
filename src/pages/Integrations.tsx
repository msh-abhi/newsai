import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Mail,
  CheckCircle,
  AlertTriangle,
  Plus,
  ExternalLink,
  TestTube,
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import ConvertKitConfigModal from '../components/Distribution/ConvertKitConfigModal';
import BrevoConfigModal from '../components/Distribution/BrevoConfigModal';
import { useQuery } from '@tanstack/react-query';
import { convertKitService } from '../services/convertKitService';
import { brevoService } from '../services/brevoService';
import { useAuthStore } from '../stores/authStore';

const Integrations: React.FC = () => {
  const [showConvertKitModal, setShowConvertKitModal] = useState(false);
  const [showBrevoModal, setShowBrevoModal] = useState(false);
  const { currentOrganization } = useAuthStore();

  // Check ConvertKit connection status
  const { data: convertKitConfig, refetch: refetchConvertKit } = useQuery({
    queryKey: ['convertkit-config', currentOrganization?.id],
    queryFn: () => currentOrganization ? convertKitService.getConfig(currentOrganization.id) : null,
    enabled: !!currentOrganization,
  });

  const convertKitConnected = convertKitConfig?.is_active || false;

  // Check Brevo connection status
  const { data: brevoConfig, refetch: refetchBrevo } = useQuery({
    queryKey: ['brevo-config', currentOrganization?.id],
    queryFn: () => currentOrganization ? brevoService.getConfig(currentOrganization.id) : null,
    enabled: !!currentOrganization,
  });

  const brevoConnected = brevoConfig?.is_active || false;

  const emailProviders = [
    {
      id: 'convertkit',
      name: 'ConvertKit',
      description: 'Email marketing platform for creators',
      website: 'https://convertkit.com',
      connected: convertKitConnected,
      status: convertKitConnected ? 'Connected' : 'Not Connected',
      lastTested: convertKitConfig?.last_tested_at,
      onConfigure: () => setShowConvertKitModal(true),
    },
    {
      id: 'brevo',
      name: 'Brevo (Sendinblue)',
      description: 'All-in-one digital marketing platform',
      website: 'https://brevo.com',
      connected: brevoConnected,
      status: brevoConnected ? 'Connected' : 'Not Connected',
      lastTested: brevoConfig?.last_tested_at,
      onConfigure: () => setShowBrevoModal(true),
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Marketing automation platform',
      website: 'https://mailchimp.com',
      connected: false,
      status: 'Coming Soon',
      lastTested: null,
      onConfigure: () => {},
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      description: 'Email delivery service',
      website: 'https://sendgrid.com',
      connected: false,
      status: 'Coming Soon',
      lastTested: null,
      onConfigure: () => {},
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
            Please create or select an organization to manage integrations.
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
              Integrations
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Connect your email service providers and other tools
            </p>
          </div>
        </div>
      </motion.div>

      {/* Email Service Providers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Mail size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Email Service Providers
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connect your email marketing platforms to send newsletters
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {emailProviders.map((provider, index) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                      <Mail size={20} className="text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {provider.connected ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <AlertTriangle size={16} className="text-orange-600" />
                    )}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      provider.connected
                        ? 'text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900'
                        : provider.status === 'Coming Soon'
                        ? 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-600'
                        : 'text-orange-700 bg-orange-100 dark:text-orange-200 dark:bg-orange-900'
                    }`}>
                      {provider.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      Visit Website
                      <ExternalLink size={12} className="ml-1" />
                    </a>
                    {provider.lastTested && (
                      <span className="text-xs">
                        • Last tested: {new Date(provider.lastTested).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {provider.connected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={TestTube}
                        onClick={() => {
                          // TODO: Implement test connection
                          console.log('Testing connection for', provider.name);
                        }}
                      >
                        Test
                      </Button>
                    )}
                    <Button
                      variant={provider.connected ? "outline" : "primary"}
                      size="sm"
                      icon={provider.connected ? Settings : Plus}
                      onClick={provider.onConfigure}
                      disabled={provider.status === 'Coming Soon'}
                    >
                      {provider.connected ? 'Configure' : 'Connect'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Future Integrations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Settings size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Other Integrations
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Additional tools and services (coming soon)
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: 'Zapier', description: 'Workflow automation', icon: Settings },
              { name: 'Webhooks', description: 'Custom integrations', icon: Settings },
              { name: 'Analytics', description: 'Google Analytics, etc.', icon: Settings },
            ].map((integration, index) => (
              <div
                key={integration.name}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg opacity-60"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <integration.icon size={16} className="text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Coming Soon
                </span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ConvertKit Configuration Modal */}
      <ConvertKitConfigModal
        isOpen={showConvertKitModal}
        onClose={() => setShowConvertKitModal(false)}
        onSuccess={() => {
          refetchConvertKit();
          setShowConvertKitModal(false);
        }}
      />

      {/* Brevo Configuration Modal */}
      <BrevoConfigModal
        isOpen={showBrevoModal}
        onClose={() => setShowBrevoModal(false)}
        onSuccess={() => {
          refetchBrevo();
          setShowBrevoModal(false);
        }}
      />
    </div>
  );
};

export default Integrations;