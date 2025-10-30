import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Download, Send } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';

interface NewsletterContent {
  header: {
    title: string;
    subtitle: string;
    date: string;
    logoUrl?: string;
  };
  sections: Array<{
    id: string;
    type: 'hero' | 'article' | 'events' | 'image' | 'text';
    title: string;
    content: string;
    imageUrl?: string;
  }>;
  footer?: {
    text: string;
    links: Array<{ text: string; url: string }>;
  };
}

interface NewsletterPreviewProps {
  content: NewsletterContent;
  brandConfig?: any;
  onEdit: () => void;
  onSend?: () => void;
  onExport?: () => void;
}

const NewsletterPreview: React.FC<NewsletterPreviewProps> = ({
  content,
  brandConfig,
  onEdit,
  onSend,
  onExport,
}) => {
  const primaryColor = brandConfig?.colors?.primary || '#3B82F6';
  const fontFamily = brandConfig?.font_family || 'Inter';

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Newsletter Preview
        </h2>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
          {onExport && (
            <Button variant="outline" icon={Download} onClick={onExport}>
              Export
            </Button>
          )}
          {onSend && (
            <Button variant="primary" icon={Send} onClick={onSend}>
              Send Newsletter
            </Button>
          )}
        </div>
      </div>

      {/* Newsletter Preview */}
      <Card>
        <div 
          className="max-w-[650px] mx-auto"
          style={{ fontFamily }}
        >
          {/* Header */}
          <div className="text-center mb-8 p-6 rounded-lg" style={{ 
            background: `linear-gradient(135deg, ${primaryColor}15, ${brandConfig?.colors?.secondary || '#8B5CF6'}15)` 
          }}>
            {content.header.logoUrl && (
              <img
                src={content.header.logoUrl}
                alt="Logo"
                className="h-12 mx-auto mb-4"
              />
            )}
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: primaryColor }}
            >
              {content.header.title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {content.header.subtitle}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              {new Date(content.header.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {content.sections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                {section.type === 'image' && section.imageUrl ? (
                  <div className="text-center">
                    <img
                      src={section.imageUrl}
                      alt={section.title || 'Newsletter image'}
                      className="w-full max-w-lg mx-auto h-auto rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <>
                    {section.title && (
                      <h2 
                        className="text-2xl font-bold mb-4"
                        style={{ color: brandConfig?.colors?.secondary || '#1F2937' }}
                      >
                        {section.title}
                      </h2>
                    )}
                    
                    {section.imageUrl && (section.type === 'hero' || section.type === 'article') && (
                      <img
                        src={section.imageUrl}
                        alt={section.title}
                        className="w-full h-64 object-cover rounded-lg mb-6 shadow-sm"
                      />
                    )}
                    
                    <div
                      className="prose prose-lg max-w-none dark:prose-invert"
                      style={{ 
                        '--tw-prose-body': brandConfig?.colors?.text || '#374151',
                        '--tw-prose-links': brandConfig?.colors?.accent || '#F97316',
                      }}
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </>
                )}
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {content.footer?.text || brandConfig?.footer_text || 'Thank you for reading!'}
            </p>
            
            <div className="flex justify-center space-x-6 text-sm">
              {content.footer?.links?.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
                >
                  {link.text}
                </a>
              )) || (
                <>
                  <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                    Unsubscribe
                  </a>
                  <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                    Privacy Policy
                  </a>
                  <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                    Contact Us
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NewsletterPreview;