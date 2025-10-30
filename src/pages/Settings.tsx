import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Users,
  Bell,
  Shield,
  CreditCard,
  Key,
  Trash2,
  Save,
} from 'lucide-react';
import { Building } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { useAuth } from '../providers/AuthProvider';
import { useAuthStore } from '../stores/authStore';
import CreateOrganizationForm from '../components/Organization/CreateOrganizationForm';
import { userService } from '../services/userService';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [showCreateOrgForm, setShowCreateOrgForm] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    timezone: user?.user_metadata?.timezone || 'America/New_York',
  });

  const [orgData, setOrgData] = useState({
    name: currentOrganization?.name || '',
    plan: currentOrganization?.plan || 'free',
    max_newsletters: currentOrganization?.settings?.max_newsletters_per_month || 0,
  });

  const [notifications, setNotifications] = useState({
    email_newsletter_sent: true,
    email_generation_complete: true,
    email_api_errors: true,
    email_usage_alerts: false,
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const sections = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'organization', name: 'Organization', icon: Users },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'api', name: 'API Keys', icon: Key },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeSection === 'profile' && user) {
        await userService.updateProfile(user.id, {
          full_name: profileData.full_name,
          timezone: profileData.timezone,
        });
        
        // Invalidate auth queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
      
      if (activeSection === 'organization' && currentOrganization) {
        await userService.updateOrganization(currentOrganization.id, {
          name: orgData.name,
        });
        
        // Invalidate organization queries
        queryClient.invalidateQueries({ queryKey: ['organizations'] });
      }
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Settings save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.new.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      await userService.changePassword(passwordData.current, passwordData.new);
      setPasswordData({ current: '', new: '', confirm: '' });
      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to update password. Please check your current password.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrgSuccess = () => {
    setShowCreateOrgForm(false);
    toast.success('Organization created successfully! You can now access all features.');
  };

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
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage your account and organization preferences
            </p>
          </div>
          {(activeSection === 'profile' || activeSection === 'organization') && (
            <Button
              variant="primary"
              icon={Save}
              loading={saving}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{section.name}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </motion.div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {activeSection === 'profile' && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Profile Settings
                </h2>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={profileData.timezone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'organization' && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Organization Settings
                </h2>

                {currentOrganization ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={orgData.name}
                        onChange={(e) => setOrgData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                        Current Plan: {orgData.plan.charAt(0).toUpperCase() + orgData.plan.slice(1)}
                      </h3>
                      <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <p>• {orgData.max_newsletters || 'Unlimited'} newsletters per month</p>
                        <p>• Up to {currentOrganization.settings?.max_team_members || 3} team members</p>
                        <p>• {currentOrganization.settings?.custom_branding ? 'Custom branding' : 'Basic analytics and reporting'}</p>
                        {currentOrganization.settings?.api_access && <p>• API access enabled</p>}
                      </div>
                      <Button variant="outline" size="sm" className="mt-3">
                        Upgrade Plan
                      </Button>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                        Additional Organizations
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Create additional organizations to manage separate projects or teams.
                      </p>
                      <Button
                        variant="outline"
                        icon={Building}
                        onClick={() => setShowCreateOrgForm(true)}
                      >
                        Create New Organization
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Organization Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      You need to create an organization to access all features.
                    </p>
                    <Button
                      variant="primary"
                      icon={Building}
                      onClick={() => setShowCreateOrgForm(true)}
                    >
                      Create Organization
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {activeSection === 'notifications' && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Notification Preferences
                </h2>
                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {key.replace(/^email_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          Receive email notifications for this event
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </Card>
            )}

            {activeSection === 'security' && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Security Settings
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                      Change Password
                    </h3>
                    <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} className="space-y-4">
                      <input
                        type="password"
                        placeholder="Current password"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                        autoComplete="current-password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                        autoComplete="new-password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                        autoComplete="new-password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <Button 
                        type="submit"
                        variant="primary"
                        loading={saving}
                        disabled={!passwordData.current || !passwordData.new || !passwordData.confirm}
                      >
                        Update Password
                      </Button>
                    </form>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="font-medium text-red-600 mb-4">
                      Danger Zone
                    </h3>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">
                        Delete Account
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                        This action cannot be undone. All your data will be permanently deleted.
                      </p>
                      <Button 
                        variant="danger" 
                        icon={Trash2} 
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
                            userService.deleteAccount();
                          }
                        }}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'billing' && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Billing & Usage
                </h2>
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Current Usage
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Newsletters this month:</span>
                        <span className="ml-2 font-medium">0 / {orgData.max_newsletters || 'Unlimited'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">AI API calls:</span>
                        <span className="ml-2 font-medium">0</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                      Upgrade Plan
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {['Free', 'Pro', 'Enterprise'].map((plan) => (
                        <div
                          key={plan}
                          className={`p-4 border rounded-lg ${
                            plan.toLowerCase() === orgData.plan
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {plan}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {plan === 'Free' && '$0/month'}
                            {plan === 'Pro' && '$29/month'}
                            {plan === 'Enterprise' && 'Custom pricing'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeSection === 'api' && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  API Access
                </h2>
                <div className="space-y-6">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                      API Key
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                      Use this key to access the newsletter generation API programmatically.
                    </p>
                    <div className="flex items-center space-x-3">
                      <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm">
                        {currentOrganization?.id ? `ai_newsletter_${currentOrganization.id.slice(0, 8)}••••••••••••••••••••••••••••••••••••` : 'No organization selected'}
                      </code>
                      <Button variant="outline" size="sm">
                        Regenerate
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                      API Documentation
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Access comprehensive API documentation and examples for integrating newsletter generation into your workflow.
                    </p>
                    <Button variant="outline">
                      View Documentation
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateOrgForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <CreateOrganizationForm
                showCard={false}
                title="Create New Organization"
                description="Set up a new organization to manage separate projects or teams."
                onCreateSuccess={handleCreateOrgSuccess}
                onCancel={() => setShowCreateOrgForm(false)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Settings;