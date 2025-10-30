import React from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Star,
  Edit,
  Globe,
  User,
  FileText,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import Card from '../UI/Card';
import { Menu } from '@headlessui/react';
import { useKnowledge } from '../../hooks/useKnowledge';
import toast from 'react-hot-toast';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface KnowledgeItemCardProps {
  item: KnowledgeItem;
}

const KnowledgeItemCard: React.FC<KnowledgeItemCardProps> = ({ item }) => {
  const { deleteItem } = useKnowledge();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company_info':
        return Briefcase;
      case 'expertise':
        return Star;
      case 'work':
        return Edit;
      case 'website':
        return Globe;
      case 'social':
        return User;
      default:
        return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'company_info':
        return 'Company Info';
      case 'expertise':
        return 'Expertise';
      case 'work':
        return 'Recent Work';
      case 'website':
        return 'Website';
      case 'social':
        return 'Social Media';
      default:
        return 'Custom';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'company_info':
        return 'text-blue-600 bg-blue-100 dark:text-blue-200 dark:bg-blue-900';
      case 'expertise':
        return 'text-purple-600 bg-purple-100 dark:text-purple-200 dark:bg-purple-900';
      case 'work':
        return 'text-green-600 bg-green-100 dark:text-green-200 dark:bg-green-900';
      case 'website':
        return 'text-orange-600 bg-orange-100 dark:text-orange-200 dark:bg-orange-900';
      case 'social':
        return 'text-pink-600 bg-pink-100 dark:text-pink-200 dark:bg-pink-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-200 dark:bg-gray-900';
    }
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    toast('Edit functionality coming soon!', {
      icon: '✏️',
      duration: 3000,
    });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this knowledge item? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteItem.mutateAsync(item.id);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const TypeIcon = getTypeIcon(item.type);

  return (
    <Card hover>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
            <TypeIcon size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {item.title}
            </h3>
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
              {getTypeLabel(item.type)}
            </span>
          </div>
        </div>

        <Menu as="div" className="relative">
          <Menu.Button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            <MoreVertical size={16} />
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleEdit}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                  >
                    Edit
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleDelete}
                    className={`${
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } block w-full text-left px-4 py-2 text-sm text-red-600`}
                  >
                    Delete
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">
        {item.content}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          Updated {new Date(item.updated_at).toLocaleDateString()}
        </span>
        {item.type === 'website' && (
          <ExternalLink size={14} className="text-blue-600" />
        )}
      </div>
    </Card>
  );
};

export default KnowledgeItemCard;