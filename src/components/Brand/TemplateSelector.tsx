import React from 'react';
import { motion } from 'framer-motion';

interface TemplateSelectorProps {
  selected: string;
  onChange: (template: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ selected, onChange }) => {
  const templates = [
    {
      id: 'modern',
      name: 'Modern',
      description: 'Clean lines with bold typography',
      preview: 'Modern layout with geometric shapes',
    },
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional newsletter format',
      preview: 'Classic two-column layout',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple and focused design',
      preview: 'Minimal single-column layout',
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Artistic and unique styling',
      preview: 'Creative asymmetric layout',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {templates.map((template) => (
        <motion.button
          key={template.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange(template.id)}
          className={`p-4 border-2 rounded-lg text-left transition-all ${
            selected === template.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
          }`}
        >
          {/* Template Preview */}
          <div className={`w-full h-16 rounded-md mb-3 ${
            selected === template.id ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-600'
          } flex items-center justify-center text-xs text-gray-500 dark:text-gray-400`}>
            {template.preview}
          </div>
          
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {template.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {template.description}
          </p>
        </motion.button>
      ))}
    </div>
  );
};

export default TemplateSelector;