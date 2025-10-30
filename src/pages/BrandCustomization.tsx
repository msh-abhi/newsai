import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Eye, Save, Upload, Type, Layout } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import ColorPicker from '../components/Brand/ColorPicker';
import TemplateSelector from '../components/Brand/TemplateSelector';
import NewsletterPreview from '../components/Brand/NewsletterPreview';
import { brandService } from '../services/brandService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const BrandCustomization: React.FC = () => {
  const { currentOrganization } = useAuthStore();
  const queryClient = useQueryClient();
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Fetch existing brand config
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['brand-config', currentOrganization?.id],
    queryFn: () => currentOrganization ? brandService.getBrandConfig(currentOrganization.id) : null,
    enabled: !!currentOrganization,
  });

  // Initialize brand config state
  const [brandConfig, setBrandConfig] = useState(() => ({
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#F97316',
    },
    logoUrl: '',
    fontFamily: 'Inter',
    template: 'modern' as const,
  }));

  // Update local state when data is loaded
  React.useEffect(() => {
    if (existingConfig) {
      setBrandConfig({
        colors: existingConfig.colors,
        logoUrl: existingConfig.logo_url || '',
        fontFamily: existingConfig.font_family,
        template: existingConfig.template,
      });
    }
  }, [existingConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }

      return brandService.saveBrandConfig({
        id: existingConfig?.id,
        organization_id: currentOrganization.id,
        colors: brandConfig.colors,
        logo_url: brandConfig.logoUrl,
        font_family: brandConfig.fontFamily,
        template: brandConfig.template,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-config'] });
      toast.success('Brand settings saved successfully!');
    },
    onError: (error) => {
      console.error('Brand save error:', error);
      toast.error('Failed to save brand settings. Please try again.');
    },
  });

  const handleColorChange = (colorType: keyof typeof brandConfig.colors, color: string) => {
    setBrandConfig(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorType]: color,
      },
    }));
  };

  const handleSave = async () => {
    saveMutation.mutate();
  };

  if (!currentOrganization) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Organization Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please create or select an organization to customize your brand.
          </p>
        </Card>
      </div>
    );
  }

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Montserrat', label: 'Montserrat' },
  ];

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
              Brand Customization
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Design your newsletter template and brand identity
            </p>
          </div>
          <div className="flex space-x-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  previewMode === 'desktop'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Desktop
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  previewMode === 'mobile'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Mobile
              </button>
            </div>
            <Button
              variant="primary"
              icon={Save}
              loading={saveMutation.isPending}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Customization Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Color Scheme */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Palette size={20} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Color Scheme
                </h2>
              </div>

              <div className="space-y-4">
                <ColorPicker
                  label="Primary Color"
                  color={brandConfig.colors.primary}
                  onChange={(color) => handleColorChange('primary', color)}
                />
                <ColorPicker
                  label="Secondary Color"
                  color={brandConfig.colors.secondary}
                  onChange={(color) => handleColorChange('secondary', color)}
                />
                <ColorPicker
                  label="Accent Color"
                  color={brandConfig.colors.accent}
                  onChange={(color) => handleColorChange('accent', color)}
                />
              </div>
            </Card>
          </motion.div>

          {/* Logo Upload */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Upload size={20} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Logo
                </h2>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                {brandConfig.logoUrl ? (
                  <img
                    src={brandConfig.logoUrl}
                    alt="Logo"
                    className="max-h-16 mx-auto mb-4"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                )}
                <Button variant="outline" size="sm">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Newsletter Footer Text
                </label>
                <textarea
                  value={brandConfig.footerText}
                  onChange={(e) => setBrandConfig(prev => ({ ...prev, footerText: e.target.value }))}
                  placeholder="Enter custom footer text for your newsletters..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This text will appear at the bottom of all your newsletters
                </p>
              </div>
                  Upload Logo
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  PNG, JPG up to 2MB
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Typography */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Type size={20} className="text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Typography
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Family
                </label>
                <select
                  value={brandConfig.fontFamily}
                  onChange={(e) => setBrandConfig(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {fontOptions.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          </motion.div>

          {/* Template Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Layout size={20} className="text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Template
                </h2>
              </div>

              <TemplateSelector
                selected={brandConfig.template}
                onChange={(template) => setBrandConfig(prev => ({ ...prev, template }))}
              />
            </Card>
          </motion.div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                  <Eye size={20} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Live Preview
                </h2>
              </div>

              <NewsletterPreview
                brandConfig={brandConfig}
                previewMode={previewMode}
              />
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BrandCustomization;