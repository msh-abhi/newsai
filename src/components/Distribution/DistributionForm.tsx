import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Calendar,
  Users,
  TestTube,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  Target,
} from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { useQuery } from '@tanstack/react-query';
import { convertKitService } from '../../services/convertKitService';
import { brevoService } from '../../services/brevoService';
import { newsletterService } from '../../services/newsletterService';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';
import TemplateSelector from './TemplateSelector';
import { getTemplateById, getDefaultTemplate } from '../../templates/emailTemplates';

const DistributionForm: React.FC = () => {
  const [selectedNewsletter, setSelectedNewsletter] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [subject, setSubject] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('classic');
  const [selectedProvider, setSelectedProvider] = useState<'convertkit' | 'brevo'>('convertkit');
  const { currentOrganization } = useAuthStore();

  // Fetch ready newsletters
  const { data: newsletters = [], isLoading: newslettersLoading } = useQuery({
    queryKey: ['newsletters', 'ready', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const allNewsletters = await newsletterService.getNewsletters(currentOrganization.id);
      return allNewsletters.filter(newsletter => newsletter.status === 'ready');
    },
    enabled: !!currentOrganization,
  });

  // Check ConvertKit connection
  const { data: convertKitConfig } = useQuery({
    queryKey: ['convertkit-config', currentOrganization?.id],
    queryFn: () => currentOrganization ? convertKitService.getConfig(currentOrganization.id) : null,
    enabled: !!currentOrganization,
  });

  const convertKitConnected = convertKitConfig?.is_active || false;

  // Check Brevo connection
  const { data: brevoConfig } = useQuery({
    queryKey: ['brevo-config', currentOrganization?.id],
    queryFn: () => currentOrganization ? brevoService.getConfig(currentOrganization.id) : null,
    enabled: !!currentOrganization,
  });

  const brevoConnected = brevoConfig?.is_active || false;

  // Determine which provider to use
  const anyProviderConnected = convertKitConnected || brevoConnected;

  // Auto-select the first connected provider
  React.useEffect(() => {
    if (convertKitConnected && !brevoConnected) {
      setSelectedProvider('convertkit');
    } else if (brevoConnected && !convertKitConnected) {
      setSelectedProvider('brevo');
    }
  }, [convertKitConnected, brevoConnected]);

  // Fetch subscribers for segment selection based on selected provider
  const { data: subscribers = [], error: subscribersError } = useQuery({
    queryKey: ['subscribers', selectedProvider, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];

      if (selectedProvider === 'convertkit' && convertKitConnected) {
        return convertKitService.getSubscribers(currentOrganization.id);
      } else if (selectedProvider === 'brevo' && brevoConnected) {
        return brevoService.getContacts(currentOrganization.id);
      }

      return [];
    },
    enabled: !!currentOrganization && anyProviderConnected,
    retry: false,
  });

  const handleSendTest = async () => {
    if (!selectedNewsletter || !subject.trim() || !testEmail.trim()) {
      toast.error('Please select a newsletter, enter a subject line, and provide a test email address');
      return;
    }

    if (!anyProviderConnected) {
      toast.error('No email provider connected. Please configure an email provider first.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingTest(true);
    try {
      const newsletter = newsletters.find(n => n.id === selectedNewsletter);
      if (!newsletter) {
        throw new Error('Newsletter not found');
      }

      const template = getTemplateById(selectedTemplateId) || getDefaultTemplate();
      const htmlContent = template.generateHTML({
        header: {
          title: newsletter.content?.header?.title || newsletter.title,
          subtitle: newsletter.content?.header?.subtitle || '',
          date: newsletter.content?.header?.date || newsletter.created_at,
        },
        sections: newsletter.content?.sections || [],
        footer: {
          text: 'Thank you for reading!',
          unsubscribeUrl: '{{unsubscribe_url}}',
        },
      });

      let result;
      if (selectedProvider === 'convertkit') {
        result = await convertKitService.sendTestEmail(
          currentOrganization!.id,
          htmlContent,
          subject,
          testEmail
        );
      } else {
        result = await brevoService.sendTestEmail(
          currentOrganization!.id,
          htmlContent,
          subject,
          testEmail
        );
      }

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Test email error:', error);
      toast.error('Failed to send test email. Please try again.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSend = async () => {
    if (!selectedNewsletter || !subject.trim()) {
      toast.error('Please select a newsletter and enter a subject line');
      return;
    }

    if (!anyProviderConnected) {
      toast.error('No email provider connected. Please configure an email provider first.');
      return;
    }

    setSending(true);
    try {
      const newsletter = newsletters.find(n => n.id === selectedNewsletter);
      if (!newsletter) {
        throw new Error('Newsletter not found');
      }

      const template = getTemplateById(selectedTemplateId) || getDefaultTemplate();
      const htmlContent = template.generateHTML({
        header: {
          title: newsletter.content?.header?.title || newsletter.title,
          subtitle: newsletter.content?.header?.subtitle || '',
          date: newsletter.content?.header?.date || newsletter.created_at,
        },
        sections: newsletter.content?.sections || [],
        footer: {
          text: 'Thank you for reading!',
          unsubscribeUrl: '{{unsubscribe_url}}',
        },
      });

      let result;
      if (selectedProvider === 'convertkit') {
        result = await convertKitService.sendNewsletter(
          currentOrganization!.id,
          htmlContent,
          subject,
          selectedSegment === 'all' ? undefined : selectedSegment
        );
      } else {
        result = await brevoService.sendNewsletter(
          currentOrganization!.id,
          htmlContent,
          subject
        );
      }

      if (result.success) {
        toast.success(result.message);

        await newsletterService.updateNewsletter(selectedNewsletter, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        setSelectedNewsletter('');
        setSubject('');
        setSelectedSegment('all');
        setScheduleDate('');
        setScheduleTime('');
        setTestEmail('');
        setSelectedTemplateId('classic');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send newsletter. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!anyProviderConnected) {
    return (
      <Card className="text-center">
        <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Email Service Not Connected
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Connect an email service provider in the Integrations section to send newsletters.
        </p>
        <Button
          variant="primary"
          onClick={() => window.location.href = '/app/integrations'}
        >
          Go to Integrations
        </Button>
      </Card>
    );
  }

  if (subscribersError) {
    return (
      <Card className="text-center">
        <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Email Provider Configuration Error
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {subscribersError.message || 'There was an error with your email provider configuration. Please check your API credentials.'}
        </p>
        <Button
          variant="primary"
          onClick={() => window.location.href = '/app/integrations'}
        >
          Fix Configuration
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Send size={20} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Send Newsletter
          </h2>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="space-y-6">
          {/* Email Provider Selection */}
          {convertKitConnected && brevoConnected && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as 'convertkit' | 'brevo')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="convertkit">ConvertKit</option>
                <option value="brevo">Brevo</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose which email service to use for sending this newsletter
              </p>
            </div>
          )}

          {/* Newsletter Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Newsletter
            </label>
            {newslettersLoading ? (
              <div className="flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                <LoadingSpinner size="small" />
                <span className="text-gray-600 dark:text-gray-300">Loading newsletters...</span>
              </div>
            ) : newsletters.length > 0 ? (
              <select
                value={selectedNewsletter}
                onChange={(e) => setSelectedNewsletter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Choose a newsletter to send</option>
                {newsletters.map((newsletter) => (
                  <option key={newsletter.id} value={newsletter.id}>
                    {newsletter.title} - {new Date(newsletter.updated_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400">
                No ready newsletters available. Please generate a newsletter first.
              </div>
            )}
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject line"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Template Selection */}
          <TemplateSelector
            selectedTemplateId={selectedTemplateId}
            onSelect={setSelectedTemplateId}
          />

          {/* Test Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address for testing"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Send a test email to this address before sending to all subscribers
            </p>
          </div>

          {/* Segment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Send to Segment
            </label>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Subscribers ({subscribers.length.toLocaleString()})</option>
              {subscribers.length > 10 && (
                <option value="recent">Recent Subscribers (Last 30 days)</option>
              )}
              {subscribers.length > 50 && (
                <option value="engaged">Highly Engaged Subscribers</option>
              )}
            </select>
          </div>

          {/* Schedule Options */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Date (Optional)
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Time (Optional)
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Send Button */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              icon={TestTube}
              disabled={!selectedNewsletter || !subject.trim() || !testEmail.trim()}
              loading={sendingTest}
              onClick={handleSendTest}
              className="flex-1"
            >
              Send Test
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={scheduleDate ? Calendar : Send}
              loading={sending}
              disabled={!selectedNewsletter || !subject.trim() || newsletters.length === 0}
              className="flex-1"
            >
              {scheduleDate ? 'Schedule Newsletter' : 'Send Now'}
            </Button>
          </div>
        </form>

        {/* Send Summary */}
        {selectedNewsletter && subject && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
              Send Summary
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>• Newsletter: {newsletters.find(n => n.id === selectedNewsletter)?.title}</p>
              <p>• Subject: {subject}</p>
              <p>• Recipients: {subscribers.length.toLocaleString()} subscribers</p>
              {testEmail && (
                <p>• Test Email: {testEmail}</p>
              )}
              {scheduleDate && (
                <p>• Scheduled: {new Date(`${scheduleDate}T${scheduleTime || '09:00'}`).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DistributionForm;