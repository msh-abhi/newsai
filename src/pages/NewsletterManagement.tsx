import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Mail,
  Plus,
  Search,
  Filter,
  Edit, // Used 'Edit' directly instead of aliasing CreditCard
  Trash2,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreVertical,
  Download,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { Menu } from '@headlessui/react'; // FIX: Corrected import
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useNewsletters } from '../hooks/useNewsletters';
import { useAuthStore } from '../stores/authStore';
import { Newsletter } from '../services/newsletterService';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const NewsletterManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNewsletters, setSelectedNewsletters] = useState<string[]>([]);
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();
  
  const {
    newsletters,
    isLoading,
    error,
    deleteNewsletter,
    createNewsletter,
    refetch,
  } = useNewsletters();

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'generating', label: 'Generating' },
    { value: 'ready', label: 'Ready' },
    { value: 'sent', label: 'Sent' },
  ];

  const filteredNewsletters = newsletters?.filter(newsletter => {
    const matchesSearch = newsletter.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || newsletter.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'ready':
        return <Eye size={16} className="text-blue-600" />;
      case 'generating':
        return <Clock size={16} className="text-orange-600" />;
      default:
        return <Edit size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900';
      case 'ready':
        return 'text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-900';
      case 'generating':
        return 'text-orange-700 bg-orange-100 dark:text-orange-200 dark:bg-orange-900';
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-gray-900';
    }
  };

  const handleDelete = async (newsletterId: string) => {
    if (!confirm('Are you sure you want to delete this newsletter? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteNewsletter.mutateAsync(newsletterId);
      toast.success('Newsletter deleted successfully!');
    } catch (error) {
      console.error('Delete newsletter error:', error);
      toast.error('Failed to delete newsletter');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNewsletters.length === 0) {
      toast.error('Please select newsletters to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedNewsletters.length} newsletters? This action cannot be undone.`)) {
      return;
    }

    try {
      for (const id of selectedNewsletters) {
        await deleteNewsletter.mutateAsync(id);
      }
      setSelectedNewsletters([]);
      toast.success(`Deleted ${selectedNewsletters.length} newsletters successfully`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete some newsletters');
    }
  };

  const handleSelectAll = () => {
    if (selectedNewsletters.length === filteredNewsletters.length) {
      setSelectedNewsletters([]);
    } else {
      setSelectedNewsletters(filteredNewsletters.map(n => n.id));
    }
  };

  const handleDuplicate = async (newsletter: Newsletter) => {
    try {
      if (!currentOrganization) {
        toast.error('No organization selected');
        return;
      }
      
      const duplicatedNewsletter = {
        title: `${newsletter.title} (Copy)`,
        content: newsletter.content,
        status: 'draft' as const,
        organization_id: currentOrganization.id,
      };
      
      await createNewsletter.mutateAsync(duplicatedNewsletter);
      toast.success('Newsletter duplicated successfully!');
    } catch (error) {
      console.error('Duplicate newsletter error:', error);
      toast.error('Failed to duplicate newsletter');
    }
  };

  if (!currentOrganization) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Organization Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please create or select an organization to manage newsletters.
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
              Newsletter Management
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage all your newsletters in one place
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['newsletters'] })}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Link to="/app/generate">
              <Button variant="outline" icon={Plus}>
                Generate Newsletter
              </Button>
            </Link>
            <Link to="/app/editor/new">
              <Button variant="primary" icon={Edit}>
                Create Manual Newsletter
              </Button>
            </Link>
          </div>
        </div>
        {/* Note about newly generated content */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Newly generated content could take a couple of minutes to show here...
        </p>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search newsletters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {selectedNewsletters.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={handleBulkDelete}
                >
                  Delete Selected ({selectedNewsletters.length})
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Newsletter List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner size="large" />
                <p className="text-gray-600 dark:text-gray-300 mt-4">
                  Loading newsletters...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Failed to Load Newsletters
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                There was an error loading your newsletters. Please try again.
              </p>
            </div>
          ) : filteredNewsletters.length > 0 ? (
            <div className="space-y-1">
              {/* Table Header */}
              <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedNewsletters.length === filteredNewsletters.length && filteredNewsletters.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Newsletter Title
                  </span>
                </div>
                <div className="w-24 text-sm font-medium text-gray-600 dark:text-gray-300">
                  Status
                </div>
                <div className="w-32 text-sm font-medium text-gray-600 dark:text-gray-300">
                  Created
                </div>
                <div className="w-20 text-sm font-medium text-gray-600 dark:text-gray-300">
                  Actions
                </div>
              </div>

              {/* Newsletter Rows */}
              {filteredNewsletters.map((newsletter, index) => (
                <motion.div
                  key={newsletter.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedNewsletters.includes(newsletter.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNewsletters([...selectedNewsletters, newsletter.id]);
                        } else {
                          setSelectedNewsletters(selectedNewsletters.filter(id => id !== newsletter.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(newsletter.status)}
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {newsletter.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {newsletter.status === 'generating' && newsletter.generation_progress !== undefined && (
                            `${newsletter.generation_progress}% complete`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-24">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(newsletter.status)}`}>
                      {newsletter.status}
                    </span>
                  </div>

                  <div className="w-32 text-sm text-gray-600 dark:text-gray-300">
                    {new Date(newsletter.created_at).toLocaleDateString()}
                  </div>

                  <div className="w-20 flex items-center justify-end">
                    <Menu as="div" className="relative">
                      <Menu.Button className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <MoreVertical size={16} />
                      </Menu.Button>
                      <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to={`/app/editor/${newsletter.id}`}
                                className={`${
                                  active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                } flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                              >
                                <Edit size={14} className="mr-2" />
                                Edit
                              </Link>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => handleDuplicate(newsletter)}
                                className={`${
                                  active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                } flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                              >
                                <Copy size={14} className="mr-2" />
                                Duplicate
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => handleDelete(newsletter.id)}
                                className={`${
                                  active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                } flex items-center w-full text-left px-4 py-2 text-sm text-red-600`}
                              >
                                <Trash2 size={14} className="mr-2" />
                                Delete
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Menu>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No newsletters found' : 'No newsletters yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create your first newsletter to get started.'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <div className="flex space-x-3 justify-center">
                  <Link to="/app/generate">
                    <Button variant="primary" icon={Plus}>
                      Generate Newsletter
                    </Button>
                  </Link>
                  <Link to="/app/editor/new">
                    <Button variant="outline" icon={Edit}>
                      Create Manual Newsletter
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Stats Summary */}
      {newsletters && newsletters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {statusOptions.slice(1).map((status) => {
            const count = newsletters.filter(n => n.status === status.value).length;
            return (
              <Card key={status.value} padding="md" className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {status.label}
                </div>
              </Card>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default NewsletterManagement;