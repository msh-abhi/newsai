import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Upload,
  Globe,
  User,
  Briefcase,
  Star,
  Edit,
  Trash2,
  AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import KnowledgeItemCard from '../components/Knowledge/KnowledgeItemCard';
import AddKnowledgeModal from '../components/Knowledge/AddKnowledgeModal';
import { useKnowledge } from '../hooks/useKnowledge';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const KnowledgeBase: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const { currentOrganization } = useAuthStore();

  const {
    items: knowledgeItems,
    isLoading,
    error,
    refetch,
  } = useKnowledge(selectedType === 'all' ? undefined : selectedType);

  const knowledgeTypes = [
    { id: 'all', name: 'All Content', icon: BookOpen },
    { id: 'company_info', name: 'Company Info', icon: Briefcase },
    { id: 'expertise', name: 'Expertise', icon: Star },
    { id: 'work', name: 'Recent Work', icon: Edit },
    { id: 'website', name: 'Website', icon: Globe },
    { id: 'social', name: 'Social Media', icon: User },
    { id: 'custom', name: 'Custom', icon: Plus },
  ];

  // Only filter items when data is loaded and available
  const filteredItems = React.useMemo(() => {
    if (isLoading || error || !knowledgeItems) {
      return [];
    }
    
    return knowledgeItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [knowledgeItems, searchQuery, isLoading, error]);

  // Debug logs
  React.useEffect(() => {
    console.log('KnowledgeBase: Debug info:', {
      isLoading,
      error: !!error,
      knowledgeItems: knowledgeItems?.length || 0,
      filteredItems: filteredItems.length,
      selectedType,
      searchQuery,
    });
  }, [isLoading, error, knowledgeItems, filteredItems, selectedType, searchQuery]);

  const handleItemAdded = () => {
    setSelectedType('all');
    refetch();
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
            Please create or select an organization to manage your knowledge base.
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
              Knowledge Base
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage your content library for AI-powered newsletter generation
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              icon={RefreshCcw}
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setShowModal(true)}
            >
              Add Content
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Type Filter */}
            <div className="flex space-x-2 overflow-x-auto">
              {knowledgeTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedType === type.id
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{type.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Conditional Rendering based on state */}
      {isLoading ? (
        <Card className="text-center py-12">
          <LoadingSpinner size="large" />
          <p className="text-gray-600 dark:text-gray-300 mt-4">Loading knowledge items...</p>
        </Card>
      ) : error ? (
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to Load Content
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            There was an error fetching your knowledge base. Please try again.
          </p>
          <Button onClick={() => refetch()} icon={RefreshCcw}>
            Retry
          </Button>
        </Card>
      ) : filteredItems.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <KnowledgeItemCard item={item} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="text-center">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No content found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {searchQuery ? 'Try adjusting your search terms or filters.' : 'Start building your knowledge base by adding your first content item.'}
            </p>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setShowModal(true)}
            >
              Add Content
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Add Knowledge Modal */}
      <AddKnowledgeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onItemAdded={handleItemAdded}
      />
    </div>
  );
};

export default KnowledgeBase;