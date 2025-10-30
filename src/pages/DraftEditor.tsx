import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Edit,
  Eye,
  Save,
  Send,
  Users,
  MessageSquare,
  History,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { DraftPreview } from '../components/Editor/DraftPreview';
import CollaborationPanel from '../components/Editor/CollaborationPanel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsletterService } from '../services/newsletterService';
import { brandService } from '../services/brandService';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const DraftEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editableDraft, setEditableDraft] = useState<any>(null);

  // Create default draft for new newsletters
  const createDefaultDraft = () => ({
    id: 'new',
    title: 'Untitled Newsletter',
    content: {
      header: {
        title: 'Your Newsletter Title',
        subtitle: 'Weekly insights and updates',
        date: new Date().toISOString().split('T')[0],
      },
      sections: [
        {
          id: '1',
          type: 'hero' as const,
          title: 'Welcome to Your Newsletter',
          content: 'Start editing this content to create your newsletter...',
          imageUrl: 'https://images.pexels.com/photos/3985062/pexels-photo-3985062.jpeg?auto=compress&cs=tinysrgb&w=800',
        },
      ],
    },
    status: 'draft',
    organization_id: currentOrganization?.id || '',
    created_by: user?.id || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Fetch newsletter data
  const { data: draft, isLoading, error } = useQuery({
    queryKey: ['newsletter', id],
    queryFn: async () => {
      if (id === 'new') {
        return createDefaultDraft();
      }
      if (id) {
        const newsletter = await newsletterService.getNewsletter(id);
        if (newsletter) {
          // Ensure content structure is properly formatted
          if (!newsletter.content || typeof newsletter.content !== 'object') {
            newsletter.content = {
              header: {
                title: newsletter.title || 'Untitled Newsletter',
                subtitle: 'Generated newsletter content',
                date: new Date(newsletter.created_at).toISOString().split('T')[0],
              },
              sections: [],
            };
          }
          
          // Ensure header exists
          if (!newsletter.content.header) {
            newsletter.content.header = {
              title: newsletter.title || 'Untitled Newsletter',
              subtitle: 'Generated newsletter content',
              date: new Date(newsletter.created_at).toISOString().split('T')[0],
            };
          }
          
          // Ensure sections array exists
          if (!newsletter.content.sections || !Array.isArray(newsletter.content.sections)) {
            newsletter.content.sections = [];
          }
        }
        return newsletter;
      }
      return null;
    },
    enabled: !!id && !!currentOrganization,
  });

  // Update editable draft when data changes
  React.useEffect(() => {
    if (draft) {
      setEditableDraft(draft);
    }
  }, [draft]);

  // Fetch brand config for footer
  const { data: brandConfig } = useQuery({
    queryKey: ['brand-config', currentOrganization?.id],
    queryFn: () => currentOrganization ? brandService.getBrandConfig(currentOrganization.id) : null,
    enabled: !!currentOrganization,
  });

  // Create newsletter mutation
  const createMutation = useMutation({
    mutationFn: (newsletterData: any) => newsletterService.createNewsletter(newsletterData),
    onSuccess: (newNewsletter) => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Newsletter created successfully!');
      navigate(`/app/editor/${newNewsletter.id}`, { replace: true });
    },
    onError: (error) => {
      console.error('Create newsletter error:', error);
      toast.error('Failed to create newsletter');
    },
  });

  // Update newsletter mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      newsletterService.updateNewsletter(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter', id] });
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Draft saved successfully!');
    },
    onError: (error) => {
      console.error('Update newsletter error:', error);
      toast.error('Failed to save draft');
    },
  });

  const handleSave = async (updatedDraft: any) => {
    if (!currentOrganization || !user) {
      toast.error('Missing organization or user context');
      return;
    }

    const draftToSave = updatedDraft || editableDraft;
    if (!draftToSave) {
      toast.error('No draft data to save');
      return;
    }

    if (id === 'new') {
      // Create new newsletter
      createMutation.mutate({
        organization_id: currentOrganization.id,
        title: draftToSave.title || 'Untitled Newsletter',
        content: draftToSave.content,
        status: 'draft',
        created_by: user.id,
      });
    } else if (draftToSave?.id) {
      // Update existing newsletter
      updateMutation.mutate({
        id: draftToSave.id,
        updates: {
          title: draftToSave.title,
          content: draftToSave.content,
        },
      });
    }
    setHasUnsavedChanges(false);
  };

  const handleSend = () => {
    const currentDraft = editableDraft || draft;
    if (!currentDraft) return;
    // Navigate to distribution page with newsletter ID
    navigate(`/app/distribution?newsletter=${currentDraft.id}`);
  };

  const handleContentChange = (updatedDraft: any) => {
    setEditableDraft(updatedDraft);
    setHasUnsavedChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="text-gray-600 dark:text-gray-300 mt-4">
            Loading newsletter draft...
          </p>
        </div>
      </div>
    );
  }

  if (error || (!draft && !editableDraft)) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Newsletter Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {id === 'new' 
              ? 'Unable to create a new newsletter. Please check your organization settings.'
              : "The newsletter draft you're looking for doesn't exist or you don't have permission to view it."
            }
          </p>
          <div className="flex space-x-3 justify-center">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/app')}
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentDraft = editableDraft || draft;
  if (!currentDraft) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Loading Newsletter
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we load your newsletter...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 w-full z-10 bg-white dark:bg-gray-800 px-4 py-3 shadow-md border-b border-gray-200 dark:border-gray-700">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {currentDraft.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {currentDraft.status.charAt(0).toUpperCase() + currentDraft.status.slice(1)} • Last updated {new Date(currentDraft.updated_at).toLocaleDateString()}
                {hasUnsavedChanges && <span className="text-orange-600 ml-2">• Unsaved changes</span>}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Mobile/Desktop Preview Toggle */}
              <div className="hidden md:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    previewMode === 'desktop'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    previewMode === 'mobile'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Mobile
                </button>
              </div>

              {/* Actions */}
              {currentDraft.status === 'ready' && (
                <Button
                  variant="primary"
                  type="button"
                  size="sm"
                  icon={Send}
                  onClick={handleSend}
                >
                  Send
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="pt-20 md:pt-24">
        {/* Main Editor */}
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <DraftPreview
              draft={currentDraft}
              previewMode={previewMode}
              brandConfig={brandConfig}
              onUpdate={handleContentChange}
              onSave={() => handleSave(editableDraft)}
              saving={createMutation.isPending || updateMutation.isPending}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DraftEditor;