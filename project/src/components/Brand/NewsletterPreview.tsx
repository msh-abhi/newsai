import React from 'react';
import { motion } from 'framer-motion';

interface BrandConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logoUrl: string;
  fontFamily: string;
  template: string;
}

interface NewsletterPreviewProps {
  brandConfig: BrandConfig;
  previewMode: 'desktop' | 'mobile';
}

const NewsletterPreview: React.FC<NewsletterPreviewProps> = ({ brandConfig, previewMode }) => {
  const containerStyle = {
    fontFamily: brandConfig.fontFamily,
  };

  const primaryStyle = { color: brandConfig.colors.primary };
  const secondaryStyle = { color: brandConfig.colors.secondary };
  const accentStyle = { color: brandConfig.colors.accent };

  return (
    <div className="h-96 overflow-auto bg-gray-100 dark:bg-gray-900 rounded-lg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto bg-white dark:bg-gray-800 shadow-lg max-w-[650px]"
        style={containerStyle}
      >
        {/* Header */}
        <div
          className="px-6 py-8 text-center"
          style={{ backgroundColor: brandConfig.colors.primary + '15' }}
        >
          {brandConfig.logoUrl ? (
            <img src={brandConfig.logoUrl} alt="Logo" className="h-12 mx-auto mb-4" />
          ) : (
            <div
              className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: brandConfig.colors.primary }}
            >
              <span className="text-white font-bold text-lg">AI</span>
            </div>
          )}
          <h1 className="text-2xl font-bold" style={primaryStyle}>
            Weekly AI Insights
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            January 15, 2024 • Issue #42
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Featured Article */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3" style={secondaryStyle}>
              Featured: AI in Healthcare
            </h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <img
                src="https://images.pexels.com/photos/3985062/pexels-photo-3985062.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="AI Healthcare"
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Revolutionary breakthroughs in AI-powered diagnostic tools are transforming patient care...
              </p>
            </div>
            <button
              className="font-medium transition-colors hover:underline"
              style={accentStyle}
            >
              Read more →
            </button>
          </div>

          {/* News Items */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                This Week's Highlights
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: brandConfig.colors.accent }}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    OpenAI announces GPT-5 with enhanced reasoning capabilities
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: brandConfig.colors.accent }}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Google's new AI model achieves breakthrough in protein folding
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: brandConfig.colors.accent }}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Local AI meetup: "Machine Learning in Practice" - Jan 20th
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 text-center"
          style={{ backgroundColor: brandConfig.colors.primary + '08' }}
        >
          {brandConfig.footerText ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {brandConfig.footerText}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2024 Your Organization • Unsubscribe • Privacy Policy
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NewsletterPreview;