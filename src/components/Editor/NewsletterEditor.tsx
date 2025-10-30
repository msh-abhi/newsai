import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Type,
  Calendar,
  Users,
  Save,
  Eye,
  EyeOff,
  Upload,
  Link as LinkIcon,
  Move,
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import Card from '../UI/Card';
import Button from '../UI/Button';

interface NewsletterSection {
  id: string;
  type: 'hero' | 'article' | 'events' | 'image' | 'text';
  title: string;
  content: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

interface NewsletterContent {
  header: {
    title: string;
    subtitle: string;
    date: string;
    logoUrl?: string;
  };
  sections: NewsletterSection[];
  footer?: {
    text: string;
    links: Array<{ text: string; url: string }>;
  };
}

interface NewsletterEditorProps {
  content: NewsletterContent;
  onChange: (content: NewsletterContent) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving?: boolean;
  brandConfig?: any;
  previewMode?: 'desktop' | 'mobile';
  hasUnsavedChanges?: boolean;
}

const NewsletterEditor: React.FC<NewsletterEditorProps> = ({
  content,
  onChange,
  onSave,
  onCancel,
  saving = false,
  brandConfig,
  previewMode = 'desktop',
  hasUnsavedChanges = false,
}) => {
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showAddSectionDropdown, setShowAddSectionDropdown] = useState(false);
  const addSectionDropdownRef = useRef<HTMLDivElement>(null);

  // Close add section dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addSectionDropdownRef.current && !addSectionDropdownRef.current.contains(event.target as Node)) {
        setShowAddSectionDropdown(false);
      }
    };

    if (showAddSectionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddSectionDropdown]);

  const updateHeader = useCallback((field: string, value: string) => {
    onChange({
      ...content,
      header: {
        ...content.header,
        [field]: value,
      },
    });
  }, [content, onChange]);

  const updateSection = useCallback((sectionId: string, updates: Partial<NewsletterSection>) => {
    onChange({
      ...content,
      sections: content.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    });
  }, [content, onChange]);

  const addSection = useCallback((type: NewsletterSection['type'] = 'text') => {
    const newSection: NewsletterSection = {
      id: `section-${Date.now()}`,
      type,
      title: type === 'hero' ? 'New Hero Section' : 'New Section',
      content: type === 'image' ? '' : '<p>Start writing your content here...</p>',
      imageUrl: type === 'image' ? 'https://images.pexels.com/photos/3985062/pexels-photo-3985062.jpeg?auto=compress&cs=tinysrgb&w=800' : undefined,
    };

    onChange({
      ...content,
      sections: [...content.sections, newSection],
    });
    setShowAddSectionDropdown(false);
  }, [content, onChange]);

  const deleteSection = useCallback((sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      onChange({
        ...content,
        sections: content.sections.filter(section => section.id !== sectionId),
      });
    }
  }, [content, onChange]);

  const moveSection = useCallback((fromIndex: number, toIndex: number) => {
    const newSections = [...content.sections];
    const [movedSection] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, movedSection);
    
    onChange({
      ...content,
      sections: newSections,
    });
  }, [content, onChange]);

  const handleDragStart = (e: React.DragEvent, sectionId: string, index: number) => {
    setDraggedSection(sectionId);
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex !== dropIndex) {
      moveSection(dragIndex, dropIndex);
    }
    
    setDraggedSection(null);
  };

  const updateSectionImage = (sectionId: string, imageUrl: string) => {
    updateSection(sectionId, { imageUrl });
    setShowImageModal(null);
    setNewImageUrl('');
  };

  const stockImages = [
    'https://images.pexels.com/photos/3985062/pexels-photo-3985062.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800',
  ];

  const sectionTypes = [
    { type: 'text', label: 'Text Block', icon: Type },
    { type: 'article', label: 'Article', icon: Type },
    { type: 'hero', label: 'Hero Section', icon: Type },
    { type: 'image', label: 'Image', icon: ImageIcon },
    { type: 'events', label: 'Events', icon: Calendar },
  ];

  if (isPreviewMode) {
    return (
      <div className="space-y-4">
        {/* Preview Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Newsletter Preview
          </h2>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={() => setIsPreviewMode(false)}
            >
              Exit Preview
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              loading={saving}
              onClick={onSave}
            >
              {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <Card>
          <div className="mx-auto transition-all duration-300 max-w-[650px]">
            {/* Header Preview */}
            <div className="text-center mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              {content.header.logoUrl && (
                <img
                  src={content.header.logoUrl}
                  alt="Logo"
                  className="h-12 mx-auto mb-4"
                />
              )}
              <h1 className={`font-bold text-gray-900 dark:text-white ${
                previewMode === 'mobile' ? 'text-xl' : 'text-3xl'
              }`}>
                {content.header.title}
              </h1>
              <p className={`text-gray-600 dark:text-gray-300 mt-2 ${
                previewMode === 'mobile' ? 'text-sm' : 'text-lg'
              }`}>
                {content.header.subtitle}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                {new Date(content.header.date).toLocaleDateString()}
              </p>
            </div>

            {/* Sections Preview */}
            <div className="space-y-8">
              {content.sections.map((section) => (
                <div key={section.id}>
                  {section.type === 'image' && section.imageUrl ? (
                    <img
                      src={section.imageUrl}
                      alt={section.title}
                      className={`w-full object-cover rounded-lg ${
                        previewMode === 'mobile' ? 'h-48' : 'h-64'
                      }`}
                    />
                  ) : (
                    <>
                      <h2 className={`font-bold text-gray-900 dark:text-white mb-4 ${
                        previewMode === 'mobile' ? 'text-lg' : 'text-2xl'
                      }`}>
                        {section.title}
                      </h2>
                      <div
                        className={`prose max-w-none dark:prose-invert ${
                          previewMode === 'mobile' ? 'prose-sm' : 'prose-lg'
                        }`}
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Preview */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {content.footer?.text || brandConfig?.footer_text || 'Thank you for reading!'}
              </p>
              <div className={`flex justify-center mt-4 text-sm text-gray-600 dark:text-gray-300 ${
                previewMode === 'mobile' ? 'flex-col space-y-2' : 'space-x-6'
              }`}>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Unsubscribe
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Newsletter Editor
        </h2>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            icon={isPreviewMode ? EyeOff : Eye}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            loading={saving}
            onClick={onSave}
          >
            {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      <Card>
        <div className="transition-all duration-300 max-w-[650px] mx-auto">
          <div className="space-y-6">
          {/* Newsletter Header Editor */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Newsletter Header
            </h3>
            
            <div className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo URL (Optional)
                </label>
                <div className={`flex ${previewMode === 'mobile' ? 'flex-col space-y-2' : 'space-x-3'}`}>
                  <input
                    type="url"
                    value={content.header.logoUrl || ''}
                    onChange={(e) => updateHeader('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                      previewMode === 'mobile' ? 'w-full' : 'flex-1'
                    }`}
                  />
                  {content.header.logoUrl && (
                    <img
                      src={content.header.logoUrl}
                      alt="Logo preview"
                      className={`w-auto rounded border border-gray-300 dark:border-gray-600 ${
                        previewMode === 'mobile' ? 'h-8 mx-auto' : 'h-10'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Newsletter Title
                </label>
                <input
                  type="text"
                  value={content.header.title}
                  onChange={(e) => updateHeader('title', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-semibold ${
                    previewMode === 'mobile' ? 'text-base' : 'text-lg'
                  }`}
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={content.header.subtitle}
                  onChange={(e) => updateHeader('subtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Date */}
              <div className={previewMode === 'mobile' ? 'w-full' : ''}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Publication Date
                </label>
                <input
                  type="date"
                  value={content.header.date}
                  onChange={(e) => updateHeader('date', e.target.value)}
                  className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    previewMode === 'mobile' ? 'w-full' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Newsletter Sections */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Newsletter Sections
              </h3>
              
              {/* Add Section Dropdown */}
              <div className="relative" ref={addSectionDropdownRef}>
                <Button 
                  variant="primary" 
                  size="sm"
                  icon={Plus}
                  onClick={() => setShowAddSectionDropdown(!showAddSectionDropdown)}
                >
                  Add Section
                </Button>
                <div className={`absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg transition-all z-10 ${
                  showAddSectionDropdown ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}>
                  <div className="p-2">
                    {sectionTypes.map((sectionType) => {
                      const Icon = sectionType.icon;
                      return (
                        <button
                          key={sectionType.type}
                          onClick={() => addSection(sectionType.type as any)}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Icon size={16} />
                          <span>{sectionType.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {content.sections.map((section, index) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`relative group border-2 border-dashed rounded-lg transition-all ${
                      draggedSection === section.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${previewMode === 'mobile' ? 'p-4' : 'p-6'}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, section.id, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    {/* Section Controls */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button
                        className="p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-move"
                        title="Drag to reorder"
                      >
                        <GripVertical size={12} className="text-gray-600 dark:text-gray-300" />
                      </button>
                      {(section.type === 'hero' || section.type === 'article' || section.type === 'image') && (
                        <button
                          onClick={() => setShowImageModal(section.id)}
                          className="p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                          title="Change image"
                        >
                          <ImageIcon size={12} className="text-gray-600 dark:text-gray-300" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete section"
                      >
                        <Trash2 size={12} className="text-red-600" />
                      </button>
                    </div>

                    {/* Section Type Badge */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                        {section.type}
                      </span>
                    </div>

                    {/* Section Image (for hero, article, and image types) */}
                    {section.imageUrl && (section.type === 'hero' || section.type === 'article' || section.type === 'image') && (
                      <div className="relative mb-6">
                        <img
                          src={section.imageUrl}
                          alt={section.title}
                          className={`w-full object-cover rounded-lg ${
                            previewMode === 'mobile' ? 'h-32' : 'h-48'
                          }`}
                        />
                        <button
                          onClick={() => setShowImageModal(section.id)}
                          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                        >
                          <div className="text-white text-center">
                            <ImageIcon size={20} className="mx-auto mb-2" />
                            <span className={previewMode === 'mobile' ? 'text-xs' : 'text-sm'}>Change Image</span>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Section Title */}
                    {section.type !== 'image' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Section Title
                        </label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-semibold ${
                            previewMode === 'mobile' ? 'text-sm' : ''
                          }`}
                        />
                      </div>
                    )}

                    {/* Section Content */}
                    {section.type !== 'image' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Content
                        </label>
                        <RichTextEditor
                          content={section.content}
                          onChange={(newContent) => updateSection(section.id, { content: newContent })}
                          placeholder="Write your content here..."
                          className={previewMode === 'mobile' ? 'text-sm' : ''}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {content.sections.length === 0 && (
                <div className={`text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg ${
                  previewMode === 'mobile' ? 'py-8' : 'py-12'
                }`}>
                  <Type size={previewMode === 'mobile' ? 32 : 48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className={`font-medium text-gray-900 dark:text-white mb-2 ${
                    previewMode === 'mobile' ? 'text-base' : 'text-lg'
                  }`}>
                    No sections yet
                  </h3>
                  <p className={`text-gray-600 dark:text-gray-300 mb-6 ${
                    previewMode === 'mobile' ? 'text-sm' : ''
                  }`}>
                    Add your first section to start building your newsletter.
                  </p>
                  <Button
                    variant="primary"
                    size={previewMode === 'mobile' ? 'sm' : 'md'}
                    icon={Plus}
                    onClick={() => addSection('text')}
                  >
                    Add First Section
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Editor */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Newsletter Footer
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Footer Text
              </label>
              <textarea
                value={content.footer?.text || brandConfig?.footer_text || ''}
                onChange={(e) => onChange({
                  ...content,
                  footer: {
                    ...content.footer,
                    text: e.target.value,
                    links: content.footer?.links || [],
                  },
                })}
                placeholder="Enter footer text..."
                rows={previewMode === 'mobile' ? 2 : 3}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none ${
                  previewMode === 'mobile' ? 'text-sm' : ''
                }`}
              />
            </div>
          </div>
          </div>
        </div>
      </Card>

      {/* Image Selection Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto ${
              previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className={`font-semibold text-gray-900 dark:text-white ${
                  previewMode === 'mobile' ? 'text-base' : 'text-lg'
                }`}>
                  Change Section Image
                </h3>
                <button
                  onClick={() => setShowImageModal(null)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Custom URL Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Image URL
                  </label>
                  <div className={`flex ${previewMode === 'mobile' ? 'flex-col space-y-2' : 'space-x-2'}`}>
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                        previewMode === 'mobile' ? 'w-full text-sm' : 'flex-1'
                      }`}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => updateSectionImage(showImageModal, newImageUrl)}
                      disabled={!newImageUrl.trim()}
                      className={previewMode === 'mobile' ? 'w-full' : ''}
                    >
                      Use URL
                    </Button>
                  </div>
                </div>

                {/* Stock Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Choose from Stock Images
                  </label>
                  <div className={`grid gap-3 ${
                    previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'
                  }`}>
                    {stockImages.map((imageUrl, index) => (
                      <button
                        key={index}
                        onClick={() => updateSectionImage(showImageModal, imageUrl)}
                        className="relative group rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 transition-colors"
                      >
                        <img
                          src={imageUrl}
                          alt={`Stock image ${index + 1}`}
                          className={`w-full object-cover ${
                            previewMode === 'mobile' ? 'h-16' : 'h-24'
                          }`}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                          <span className={`text-white opacity-0 group-hover:opacity-100 transition-opacity ${
                            previewMode === 'mobile' ? 'text-xs' : 'text-sm'
                          }`}>
                            Select
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remove Image Option */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size={previewMode === 'mobile' ? 'sm' : 'md'}
                    onClick={() => updateSectionImage(showImageModal, '')}
                    className="w-full"
                  >
                    Remove Image
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NewsletterEditor;