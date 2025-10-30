import React, { useState, Fragment } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { X, Save, Globe, Upload, Edit } from 'lucide-react';
import Button from '../UI/Button';
import { useKnowledge } from '../../hooks/useKnowledge';
import { useAuthStore } from '../../stores/authStore';
import { KNOWLEDGE_TYPES } from '../../constants';
import { knowledgeService } from '../../services/knowledgeService';
import toast from 'react-hot-toast';

interface AddKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: () => void;
}

const AddKnowledgeModal: React.FC<AddKnowledgeModalProps> = ({ isOpen, onClose, onItemAdded }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('custom');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const { createItem } = useKnowledge();
  const { currentOrganization } = useAuthStore();

  const tabs = [
    { name: 'Manual Entry', icon: Edit },
    { name: 'Import from URL', icon: Globe },
    { name: 'Upload File', icon: Upload },
  ];

  const handleSave = async () => {
    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await createItem.mutateAsync({
        organization_id: currentOrganization.id,
        title: title.trim(),
        content: content.trim(),
        type: type as any,
        metadata: {},
      });
      
      // Reset form
      setTitle('');
      setContent('');
      setType('custom');
      setUrl('');
      
      // Call the callback to refresh the knowledge base list
      if (onItemAdded) {
        onItemAdded();
      }
      
      onClose();
    } catch (error) {
      console.error('Knowledge item save error:', error);
      // Error is handled by the mutation, but we still need to reset loading
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromUrl = async () => {
    if (!url.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      new URL(url.trim());
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setImporting(true);
    try {
      const importedData = await knowledgeService.importFromUrl(url.trim());
      
      setTitle(importedData.title);
      setContent(importedData.content);
      setActiveTab(0); // Switch to manual entry tab
      toast.success('Content imported successfully! Review and save.');
    } catch (error) {
      console.error('URL import error:', error);
      toast.error(error?.message || 'Failed to import content from URL');
    } finally {
      setImporting(false);
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Add Knowledge Content
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
                  <Tab.List className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-700 p-1 mb-6">
                    {tabs.map((tab, index) => {
                      const Icon = tab.icon;
                      return (
                        <Tab
                          key={tab.name}
                          className={({ selected }) =>
                            `w-full rounded-md py-2.5 px-3 text-sm font-medium leading-5 transition-all ${
                              selected
                                ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-200 shadow'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-white/[0.12] hover:text-gray-900 dark:hover:text-white'
                            }`
                          }
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <Icon size={16} />
                            <span>{tab.name}</span>
                          </div>
                        </Tab>
                      );
                    })}
                  </Tab.List>

                  <Tab.Panels>
                    {/* Manual Entry */}
                    <Tab.Panel className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Content Type
                        </label>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          {KNOWLEDGE_TYPES.map((knowledgeType) => (
                            <option key={knowledgeType.id} value={knowledgeType.id}>
                              {knowledgeType.name} - {knowledgeType.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter a descriptive title"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Content
                        </label>
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Enter your content here..."
                          rows={8}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                          required
                        />
                      </div>
                    </Tab.Panel>

                    {/* Import from URL */}
                    <Tab.Panel className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Website URL
                        </label>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                          What will be imported?
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• Page title and meta description</li>
                          <li>• Main content text</li>
                          <li>• Key information and highlights</li>
                          <li>• Structured data when available</li>
                        </ul>
                      </div>

                      {url && (
                        <Button
                          variant="outline"
                          icon={Globe}
                          loading={importing}
                          className="w-full"
                          onClick={handleImportFromUrl}
                        >
                          Import Content
                        </Button>
                      )}
                    </Tab.Panel>

                    {/* Upload File */}
                    <Tab.Panel className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                        <Upload size={32} className="mx-auto text-gray-400 mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Upload Document
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                          Supports PDF, DOC, DOCX, TXT files up to 10MB
                        </p>
                        <Button variant="outline" size="sm">
                          Choose File
                        </Button>
                      </div>

                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                          File Processing
                        </h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Uploaded files will be processed to extract text content and create searchable embeddings for AI retrieval.
                        </p>
                      </div>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>

                {/* Actions */}
                <div className="flex space-x-3 pt-6">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    icon={Save}
                    loading={loading}
                    onClick={handleSave}
                    className="flex-1"
                    disabled={!title.trim() || !content.trim()}
                  >
                    Save Content
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddKnowledgeModal;