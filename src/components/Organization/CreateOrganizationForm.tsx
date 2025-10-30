import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building, Save } from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { useOrganizations } from '../../hooks/useOrganizations';
import toast from 'react-hot-toast';

interface CreateOrganizationFormProps {
  onCreateSuccess?: () => void;
  onCancel?: () => void;
  showCard?: boolean;
  title?: string;
  description?: string;
}

const CreateOrganizationForm: React.FC<CreateOrganizationFormProps> = ({
  onCreateSuccess,
  onCancel,
  showCard = true,
  title = "Create Your Organization",
  description = "Create your organization to start generating AI-powered newsletters.",
}) => {
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const { createOrganization } = useOrganizations();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setOrgName(name);
    if (!orgSlug || orgSlug === generateSlug(orgName)) {
      setOrgSlug(generateSlug(name));
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim() || !orgSlug.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (orgSlug.length < 3) {
      toast.error('Organization slug must be at least 3 characters long');
      return;
    }
    
    if (!/^[a-z0-9-]+$/.test(orgSlug)) {
      toast.error('Organization slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setCreating(true);
    try {
      console.log('🏢 Creating organization:', { name: orgName, slug: orgSlug });
      await createOrganization.mutateAsync({
        name: orgName.trim(),
        slug: orgSlug.trim().toLowerCase(),
      });
      
      // Reset form
      setOrgName('');
      setOrgSlug('');
      
      // Call success callback if provided
      if (onCreateSuccess) {
        console.log('✅ CreateOrganizationForm: Calling success callback');
        onCreateSuccess();
      }
      
      // Add a small delay before any navigation to ensure state is updated
      setTimeout(() => {
        console.log('🔄 CreateOrganizationForm: Organization creation completed');
      }, 500);
    } catch (error) {
      console.error('❌ Organization creation failed:', error);
      // Error is handled by the mutation's onError callback, but we can add additional logging
    } finally {
      setCreating(false);
    }
  };

  const formContent = (
    <div>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building size={32} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>

      <form onSubmit={handleCreateOrganization} className="space-y-6" autoComplete="on">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Organization Name
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter your organization name"
            autoComplete="organization"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Organization Slug
          </label>
          <input
            type="text"
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="organization-slug"
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono"
            pattern="^[a-z0-9-]+$"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Used for URLs and API access. Only lowercase letters, numbers, and hyphens.
          </p>
        </div>

        <div className="flex space-x-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={Building}
            loading={creating}
            disabled={!orgName.trim() || !orgSlug.trim()}
            className={onCancel ? "flex-1" : "w-full"}
          >
            Create Organization
          </Button>
        </div>
      </form>

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          What's included:
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• 10 newsletters per month</li>
          <li>• Up to 3 team members</li>
          <li>• Basic analytics and reporting</li>
          <li>• AI-powered content generation</li>
        </ul>
      </div>

      <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Make sure you've connected to Supabase by clicking the "Connect to Supabase" button in the top right corner of the page.
        </p>
      </div>
    </div>
  );

  if (showCard) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="max-w-md mx-auto" padding="lg">
          {formContent}
        </Card>
      </motion.div>
    );
  }

  return formContent;
};

export default CreateOrganizationForm;