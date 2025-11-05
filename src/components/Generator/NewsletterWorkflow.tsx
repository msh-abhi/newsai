import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Settings,
  Palette,
  Download,
  FileText,
} from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

interface NewsletterWorkflowProps {
  onComplete: (data: any) => void;
  disabled: boolean;
}

const NewsletterWorkflow: React.FC<NewsletterWorkflowProps> = ({ onComplete, disabled }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [workflowData, setWorkflowData] = useState({
    topic: '',
    mode: 'detailed',
    instructions: '',
    settings: {},
    style: 'modern',
  });

  // Memoize steps to prevent component recreation on parent re-renders
  const steps: WorkflowStep[] = useMemo(() => [
    {
      id: 'topic',
      title: 'Topic Configuration',
      description: 'Define your newsletter focus and target audience',
      icon: Lightbulb,
      component: () => (
        <TopicConfiguration
          data={workflowData}
          onChange={(data) => setWorkflowData(prev => ({ ...prev, ...data }))}
        />
      ),
    },
    {
      id: 'mode',
      title: 'Generation Mode',
      description: 'Choose your generation approach',
      icon: Settings,
      component: () => (
        <GenerationModeSelection
          data={workflowData}
          onChange={(data) => setWorkflowData(prev => ({ ...prev, ...data }))}
        />
      ),
    },
    {
      id: 'controls',
      title: 'Generation Controls',
      description: 'Fine-tune generation parameters',
      icon: Settings,
      component: () => (
        <GenerationControls
          data={workflowData}
          onChange={(data) => setWorkflowData(prev => ({ ...prev, ...data }))}
        />
      ),
    },
    {
      id: 'style',
      title: 'Style & Preview',
      description: 'Customize visual appearance',
      icon: Palette,
      component: () => (
        <StyleCustomization
          data={workflowData}
          onChange={(data) => setWorkflowData(prev => ({ ...prev, ...data }))}
        />
      ),
    },
    {
      id: 'export',
      title: 'Export & Distribute',
      description: 'Generate and share your newsletter',
      icon: Download,
      component: () => (
        <ExportDistribution
          data={workflowData}
          onComplete={onComplete}
        />
      ),
    },
  ], []); // Empty dependency array - only create once

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {index < currentStep ? <CheckCircle size={16} /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Current Step */}
      <Card>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
              {React.createElement(steps[currentStep].icon, { 
                size: 24, 
                className: "text-blue-600" 
              })}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {steps[currentStep].title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {steps[currentStep].description}
              </p>
            </div>
          </div>

          <CurrentStepComponent />
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            icon={ChevronLeft}
          >
            Previous
          </Button>
          
          <Button
            variant="primary"
            onClick={currentStep === steps.length - 1 ? () => onComplete(workflowData) : nextStep}
            disabled={disabled}
            icon={currentStep === steps.length - 1 ? Download : ChevronRight}
          >
            {currentStep === steps.length - 1 ? 'Generate Newsletter' : 'Next Step'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Step 1: Topic Configuration Component
const TopicConfiguration: React.FC<{ data: any; onChange: (data: any) => void }> = ({
  data,
  onChange
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState('');

  // Keep local state in sync with props, but don't re-render unnecessarily
  useEffect(() => {
    setLocalValue(data.topic || '');
  }, [data.topic]);

  // Handle topic change with immediate local update
  const handleTopicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Update local state immediately for smooth typing
    setLocalValue(newValue);
    
    // Update parent component
    onChange({ topic: newValue });
  };

  // Focus and position cursor at end only when component mounts
  useEffect(() => {
    if (textareaRef.current && localValue) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []); // Empty dependency array - only run on mount

  return (
    <div className="space-y-6">
      {/* Topic Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Newsletter Topic
        </label>
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleTopicChange}
          placeholder="Describe what you'd like this newsletter to focus on..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
        />
      </div>
    </div>
  );
};

// Step 2: Generation Mode Selection Component
const GenerationModeSelection: React.FC<{ data: any; onChange: (data: any) => void }> = ({ 
  data, 
  onChange 
}) => {
  const modes = [
    {
      id: 'quick',
      title: 'Quick Generate',
      description: 'Fast AI-powered newsletter creation with essential content',
      time: '5-10 minutes',
      features: ['Basic content generation', 'Minimal research', 'Standard formatting'],
      color: 'green',
    },
    {
      id: 'detailed',
      title: 'Detailed Create',
      description: 'Comprehensive research and multi-section newsletter',
      time: '15-20 minutes',
      features: ['Deep research', 'Multiple sections', 'Source citations', 'Data analysis'],
      color: 'blue',
    },
    {
      id: 'custom',
      title: 'Template Custom',
      description: 'Custom newsletter using your templates and branding',
      time: '10-15 minutes',
      features: ['Custom templates', 'Brand integration', 'Style consistency'],
      color: 'purple',
    },
    {
      id: 'ai-assisted',
      title: 'AI Assisted',
      description: 'Collaborative approach with AI suggestions and human review',
      time: '20-30 minutes',
      features: ['AI collaboration', 'Interactive editing', 'Quality review'],
      color: 'orange',
    },
  ];

  const getColorClasses = (color: string, selected: boolean) => {
    const colors = {
      green: selected 
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
        : 'border-gray-200 dark:border-gray-600 hover:border-green-300',
      blue: selected 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300',
      purple: selected 
        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
        : 'border-gray-200 dark:border-gray-600 hover:border-purple-300',
      orange: selected 
        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
        : 'border-gray-200 dark:border-gray-600 hover:border-orange-300',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {modes.map((mode) => (
        <motion.div
          key={mode.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            p-6 border-2 rounded-xl cursor-pointer transition-all
            ${getColorClasses(mode.color, data.mode === mode.id)}
          `}
          onClick={() => onChange({ mode: mode.id })}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {mode.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {mode.time}
              </p>
            </div>
            <Circle
              size={20}
              className={data.mode === mode.id ? 'text-blue-600 fill-blue-600' : 'text-gray-400'}
            />
          </div>
          
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {mode.description}
          </p>
          
          <div className="space-y-1">
            {mode.features.map((feature) => (
              <div key={feature} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                {feature}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Step 3: Generation Controls Component
const GenerationControls: React.FC<{ data: any; onChange: (data: any) => void }> = ({ 
  data, 
  onChange 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      {/* Basic Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Sections
          </label>
          <select
            value={data.settings?.numSections || 4}
            onChange={(e) => onChange({ 
              settings: { ...data.settings, numSections: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value={2}>2 sections</option>
            <option value={3}>3 sections</option>
            <option value={4}>4 sections</option>
            <option value={5}>5 sections</option>
            <option value={6}>6 sections</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Section Length
          </label>
          <select
            value={data.settings?.sectionLength || 'medium'}
            onChange={(e) => onChange({ 
              settings: { ...data.settings, sectionLength: e.target.value }
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="short">Short (100-200 words)</option>
            <option value="medium">Medium (200-400 words)</option>
            <option value="long">Long (400-600 words)</option>
          </select>
        </div>
      </div>

      {/* Quick Options */}
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.settings?.includeImages !== false}
            onChange={(e) => onChange({ 
              settings: { ...data.settings, includeImages: e.target.checked }
            })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Include images in newsletter sections
          </span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.settings?.skipResearch || false}
            onChange={(e) => onChange({ 
              settings: { ...data.settings, skipResearch: e.target.checked }
            })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Skip web research (use only knowledge base)
          </span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.settings?.includeEvents !== false}
            onChange={(e) => onChange({ 
              settings: { ...data.settings, includeEvents: e.target.checked }
            })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Include local events and news
          </span>
        </label>
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Instructions
              </label>
              <textarea
                value={data.instructions || ''}
                onChange={(e) => onChange({ instructions: e.target.value })}
                placeholder="Any specific requirements or preferences..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Step 4: Style Customization Component
const StyleCustomization: React.FC<{ data: any; onChange: (data: any) => void }> = ({ 
  data, 
  onChange 
}) => {
  const themes = [
    {
      id: 'modern',
      name: 'Modern',
      preview: 'Clean, minimal design with plenty of white space',
      colors: ['#3B82F6', '#10B981', '#F59E0B'],
    },
    {
      id: 'professional',
      name: 'Professional',
      preview: 'Business-oriented design with structured layout',
      colors: ['#1F2937', '#374151', '#6B7280'],
    },
    {
      id: 'creative',
      name: 'Creative',
      preview: 'Bold colors and creative typography',
      colors: ['#8B5CF6', '#EF4444', '#F59E0B'],
    },
    {
      id: 'minimal',
      name: 'Minimal',
      preview: 'Ultra-clean with focus on content',
      colors: ['#000000', '#6B7280', '#F9FAFB'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Newsletter Theme
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`
                p-4 border-2 rounded-xl cursor-pointer transition-all
                ${data.style === theme.id 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }
              `}
              onClick={() => onChange({ style: theme.id })}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {theme.name}
                </h3>
                <div className="flex space-x-1">
                  {theme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {theme.preview}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Live Preview
        </label>
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-800">
          <div className="text-center mb-4">
            <h2 className={`text-2xl font-bold mb-2 ${
              data.style === 'modern' ? 'text-blue-600' :
              data.style === 'professional' ? 'text-gray-900' :
              data.style === 'creative' ? 'text-purple-600' :
              'text-gray-900'
            }`}>
              Newsletter Preview
            </h2>
            <p className={`text-sm ${
              data.style === 'modern' ? 'text-gray-600' :
              data.style === 'professional' ? 'text-gray-700' :
              data.style === 'creative' ? 'text-gray-600' :
              'text-gray-500'
            }`}>
              This is how your newsletter will look
            </p>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 5: Export & Distribution Component
const ExportDistribution: React.FC<{ data: any; onComplete: (data: any) => void }> = ({ 
  data, 
  onComplete 
}) => {
  const exportFormats = [
    {
      id: 'html',
      name: 'HTML Email',
      description: 'Ready-to-send HTML email',
      icon: FileText,
    },
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Printable PDF format',
      icon: FileText,
    },
    {
      id: 'docx',
      name: 'Word Document',
      description: 'Editable Word format',
      icon: FileText,
    },
  ];

  const distributionChannels = [
    'Email Newsletter',
    'Website Publication',
    'Social Media',
    'Download Only',
  ];

  return (
    <div className="space-y-6">
      {/* Export Format */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Export Format
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportFormats.map((format) => (
            <div
              key={format.id}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center space-x-3 mb-2">
                <format.icon size={20} className="text-gray-600" />
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {format.name}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {format.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Distribution Channel
        </label>
        <div className="space-y-2">
          {distributionChannels.map((channel) => (
            <label key={channel} className="flex items-center">
              <input
                type="radio"
                name="distribution"
                value={channel}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {channel}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Final Review */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          Generation Summary
        </h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div>Topic: {data.topic || 'Not specified'}</div>
          <div>Mode: {data.mode || 'Default'}</div>
          <div>Style: {data.style || 'Modern'}</div>
          <div>Sections: {data.settings?.numSections || 4}</div>
          <div>Length: {data.settings?.sectionLength || 'Medium'}</div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterWorkflow;
