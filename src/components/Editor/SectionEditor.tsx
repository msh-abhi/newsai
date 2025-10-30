import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GripVertical,
  Image as ImageIcon,
  Type,
  Calendar,
  Trash2,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import ImageUploader from './ImageUploader';

interface NewsletterSection {
  id: string;
  type: 'hero' | 'article' | 'events' | 'image' | 'text';
  title: string;
  content: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

interface SectionEditorProps {
  section: NewsletterSection;
  index: number;
  onUpdate: (updates: Partial<NewsletterSection>) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragging?: boolean;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  index,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
}) => {
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const getSectionIcon = () => {
    switch (section.type) {
      case 'hero':
        return <Type size={16} className="text-purple-600" />;
      case 'article':
        return <Type size={16} className="text-blue-600" />;
      case 'image':
        return <ImageIcon size={16} className="text-green-600" />;
      case 'events':
        return <Calendar size={16} className="text-orange-600" />;
      default:
        return <Type size={16} className="text-gray-600" />;
    }
  };

  const getSectionTypeColor = () => {
    switch (section.type) {
      case 'hero':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200';
      case 'article':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
      case 'image':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
      case 'events':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-move"
            title="Drag to reorder"
          >
            <GripVertical size={16} className="text-gray-400" />
          </button>
          
          <div className="flex items-center space-x-2">
            {getSectionIcon()}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSectionTypeColor()}`}>
              {section.type}
            </span>
          </div>
          
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Section {index + 1}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={collapsed ? 'Expand section' : 'Collapse section'}
          >
            {collapsed ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          
          {(section.type === 'hero' || section.type === 'article' || section.type === 'image') && (
            <button
              onClick={() => setShowImageUploader(true)}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Change image"
            >
              <ImageIcon size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
          )}
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Section settings"
          >
            <Settings size={16} className="text-gray-600 dark:text-gray-300" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete section"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4">
          {/* Section Image */}
          {section.imageUrl && (section.type === 'hero' || section.type === 'article' || section.type === 'image') && (
            <div className="relative">
              <img
                src={section.imageUrl}
                alt={section.title}
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                onClick={() => setShowImageUploader(true)}
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg"
              >
                <div className="text-white text-center">
                  <ImageIcon size={24} className="mx-auto mb-2" />
                  <span className="text-sm">Change Image</span>
                </div>
              </button>
            </div>
          )}

          {/* Section Title (not for image type) */}
          {section.type !== 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section Title
              </label>
              <input
                type="text"
                value={section.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-semibold"
                placeholder="Enter section title..."
              />
            </div>
          )}

          {/* Section Content (not for image type) */}
          {section.type !== 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content
              </label>
              <RichTextEditor
                content={section.content}
                onChange={(content) => onUpdate({ content })}
                placeholder="Write your content here..."
              />
            </div>
          )}

          {/* Section Settings */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-200 dark:border-gray-700 pt-4"
            >
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Section Settings
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Section Type
                  </label>
                  <select
                    value={section.type}
                    onChange={(e) => onUpdate({ type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="text">Text Block</option>
                    <option value="article">Article</option>
                    <option value="hero">Hero Section</option>
                    <option value="image">Image</option>
                    <option value="events">Events</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={section.metadata?.priority || 'normal'}
                    onChange={(e) => onUpdate({ 
                      metadata: { 
                        ...section.metadata, 
                        priority: e.target.value 
                      } 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Image Uploader Modal */}
      {showImageUploader && (
        <ImageUploader
          currentImageUrl={section.imageUrl}
          onImageSelect={(url) => {
            onUpdate({ imageUrl: url });
            setShowImageUploader(false);
          }}
          onClose={() => setShowImageUploader(false)}
        />
      )}
    </motion.div>
  );
};

export default SectionEditor;