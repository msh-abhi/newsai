import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { emailTemplates, EmailTemplate } from '../../templates/emailTemplates';
import Card from '../UI/Card';

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onSelect,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Email Template
      </label>
      <div className="grid md:grid-cols-3 gap-4">
        {emailTemplates.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(template.id)}
            className="cursor-pointer"
          >
            <Card
              className={`relative p-4 transition-all ${
                selectedTemplateId === template.id
                  ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              {selectedTemplateId === template.id && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="text-blue-500" size={20} />
                </div>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {template.description}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <PreviewThumbnail template={template} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const PreviewThumbnail: React.FC<{ template: EmailTemplate }> = ({ template }) => {
  const getPreviewStyles = () => {
    switch (template.id) {
      case 'classic':
        return {
          gradient: 'from-gray-100 to-gray-200',
          accent: 'bg-blue-500',
        };
      case 'modern':
        return {
          gradient: 'from-blue-500 to-purple-600',
          accent: 'bg-purple-500',
        };
      case 'minimalist':
        return {
          gradient: 'from-white to-gray-50',
          accent: 'bg-green-600',
        };
      default:
        return {
          gradient: 'from-gray-100 to-gray-200',
          accent: 'bg-blue-500',
        };
    }
  };

  const styles = getPreviewStyles();

  return (
    <div className="space-y-1.5">
      <div className={`h-8 bg-gradient-to-r ${styles.gradient} rounded`}></div>
      <div className="space-y-1">
        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
      </div>
      <div className={`h-1 ${styles.accent} rounded w-1/4`}></div>
    </div>
  );
};

export default TemplateSelector;
