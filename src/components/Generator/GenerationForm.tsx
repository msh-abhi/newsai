import React, { useState } from 'react';
import { Play, ChevronDown, AlertCircle } from 'lucide-react';
import Button from '../UI/Button';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../services/aiService';
import toast from 'react-hot-toast';
import { PRESET_CATEGORIES } from '../../constants/generationPresets';

interface GenerationFormProps {
  onGenerate: (request: any) => void;
  disabled: boolean;
}

const GenerationForm: React.FC<GenerationFormProps> = ({ onGenerate, disabled }) => {
  const { currentOrganization } = useAuthStore();
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<'quick' | 'detailed' | 'custom'>('detailed');
  const [instructions, setInstructions] = useState('');
  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeKnowledge, setIncludeKnowledge] = useState(true);
  const [skipResearch, setSkipResearch] = useState(false);
  const [numSections, setNumSections] = useState(4);
  const [sectionLength, setSectionLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeImages, setIncludeImages] = useState(true);
  const [imageSource, setImageSource] = useState<'ai' | 'web'>('web');
  const [imagePlacement, setImagePlacement] = useState<'all' | 'header'>('header');
  const [tone, setTone] = useState<string>('');
  const [style, setStyle] = useState<string>('');
  const [audience, setAudience] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [guide, setGuide] = useState<string>('');
  const [showPresets, setShowPresets] = useState(false);

  // Check if AI providers are configured
  const { data: generationProviders = [] } = useQuery({
    queryKey: ['ai-providers', 'generation', currentOrganization?.id],
    queryFn: () => currentOrganization ? aiService.getProviders(currentOrganization.id, 'generation') : [],
    enabled: !!currentOrganization,
  });

  const { data: researchProviders = [] } = useQuery({
    queryKey: ['ai-providers', 'research', currentOrganization?.id],
    queryFn: () => currentOrganization ? aiService.getProviders(currentOrganization.id, 'research') : [],
    enabled: !!currentOrganization,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate AI providers are configured
    if (generationProviders.length === 0) {
      toast.error('Please configure at least one generation AI provider first');
      return;
    }
    
    if (!topic.trim()) {
      toast.error('Please enter a topic for your newsletter');
      return;
    }

    onGenerate({
      topic,
      mode,
      instructions,
      skip_research: skipResearch,
      num_sections: numSections,
      section_length: sectionLength,
      include_images: includeImages,
      image_source: includeImages ? imageSource : undefined,
      image_placement: includeImages ? imagePlacement : undefined,
      include_events: includeEvents,
      include_knowledge: includeKnowledge,
      tone: tone || undefined,
      style: style || undefined,
      audience: audience || undefined,
      context: context || undefined,
      guide: guide || undefined,
    });
  };

  const modeOptions = [
    { value: 'quick', label: 'Quick (5 min)', description: 'Basic newsletter with core content' },
    { value: 'detailed', label: 'Detailed (15 min)', description: 'Comprehensive research and content' },
    { value: 'custom', label: 'Custom', description: 'Advanced options and fine-tuning' },
  ];

  const hasGenerationProvider = generationProviders.some(p => p.is_active && p.api_key);
  const hasResearchProvider = researchProviders.some(p => p.is_active && p.api_key);

  return (
    <div className="space-y-6">
      {/* System Status */}
      {(!hasGenerationProvider || !hasResearchProvider) && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-2">
            Setup Required
          </h4>
          <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
            {!hasGenerationProvider && <p>• Configure at least one generation AI provider</p>}
            {!hasResearchProvider && <p>• Configure at least one research AI provider (recommended)</p>}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Newsletter Topic
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe what you'd like this newsletter to focus on..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            required
          />
        </div>

        {/* Generation Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Generation Mode
          </label>
          <div className="space-y-3">
            {modeOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                  mode === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={(e) => setMode(e.target.value as 'quick' | 'detailed' | 'custom')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
            {mode === 'custom' && (
              <>
                {/* Advanced Controls */}
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Generation Controls
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Number of Sections
                      </label>
                      <select
                        value={numSections}
                        onChange={(e) => setNumSections(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value={2}>2 sections</option>
                        <option value={3}>3 sections</option>
                        <option value={4}>4 sections</option>
                        <option value={5}>5 sections</option>
                        <option value={6}>6 sections</option>
                        <option value={7}>7 sections</option>
                        <option value={8}>8 sections</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Section Length
                      </label>
                      <select
                        value={sectionLength}
                        onChange={(e) => setSectionLength(e.target.value as 'short' | 'medium' | 'long')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="short">Short (100-200 words)</option>
                        <option value="medium">Medium (200-400 words)</option>
                        <option value="long">Long (400-600 words)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeImages}
                        onChange={(e) => setIncludeImages(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Include images in newsletter sections
                      </span>
                    </label>

                    {includeImages && (
                      <div className="ml-6 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Image Source
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-start">
                              <input
                                type="radio"
                                name="imageSource"
                                value="web"
                                checked={imageSource === 'web'}
                                onChange={(e) => setImageSource('web')}
                                className="mt-1 mr-2"
                              />
                              <div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Web Images
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Fetch relevant images from the web (Pexels)
                                </p>
                              </div>
                            </label>
                            <label className="flex items-start">
                              <input
                                type="radio"
                                name="imageSource"
                                value="ai"
                                checked={imageSource === 'ai'}
                                onChange={(e) => setImageSource('ai')}
                                className="mt-1 mr-2"
                              />
                              <div className="flex items-center gap-2">
                                <div>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    AI Generated Images
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Generate custom images with AI
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
                                  <AlertCircle size={14} className="text-orange-600 dark:text-orange-400" />
                                  <span className="text-xs text-orange-700 dark:text-orange-300">
                                    Incurs AI costs
                                  </span>
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Image Placement
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-start">
                              <input
                                type="radio"
                                name="imagePlacement"
                                value="header"
                                checked={imagePlacement === 'header'}
                                onChange={(e) => setImagePlacement('header')}
                                className="mt-1 mr-2"
                              />
                              <div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Header Only
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Add image only to the first section
                                </p>
                              </div>
                            </label>
                            <label className="flex items-start">
                              <input
                                type="radio"
                                name="imagePlacement"
                                value="all"
                                checked={imagePlacement === 'all'}
                                onChange={(e) => setImagePlacement('all')}
                                className="mt-1 mr-2"
                              />
                              <div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  All Sections
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Add images to every section
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={skipResearch}
              onChange={(e) => setSkipResearch(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Skip web research (use only knowledge base and AI generation)
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeKnowledge}
              onChange={(e) => setIncludeKnowledge(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Include knowledge base content
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeEvents}
              onChange={(e) => setIncludeEvents(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Include local events (autism & sensory-friendly)
            </span>
          </label>
        </div>

        {/* Content Customization Presets */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                Content Customization
              </span>
              {(tone || style || audience || context || guide) && (
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                  {[tone, style, audience, context, guide].filter(Boolean).length} active
                </span>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>

          {showPresets && (
            <div className="p-4 space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose presets to customize your newsletter's tone, style, and structure. These settings guide the AI generation process.
              </p>

              {PRESET_CATEGORIES.map((category) => (
                <div key={category.id}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {category.label}
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {category.description}
                    </span>
                  </label>
                  <select
                    value={category.id === 'tone' ? tone : category.id === 'style' ? style : category.id === 'audience' ? audience : category.id === 'context' ? context : guide}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (category.id === 'tone') setTone(value);
                      else if (category.id === 'style') setStyle(value);
                      else if (category.id === 'audience') setAudience(value);
                      else if (category.id === 'context') setContext(value);
                      else if (category.id === 'guide') setGuide(value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Default</option>
                    {category.options.map((option) => (
                      <option key={option.id} value={option.id} title={option.description}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {(category.id === 'tone' && tone) || (category.id === 'style' && style) || (category.id === 'audience' && audience) || (category.id === 'context' && context) || (category.id === 'guide' && guide) ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {category.options.find(opt => opt.id === (category.id === 'tone' ? tone : category.id === 'style' ? style : category.id === 'audience' ? audience : category.id === 'context' ? context : guide))?.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Instructions
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              (Optional - supplements presets above)
            </span>
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Add any specific requirements not covered by the presets above..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            These instructions supplement the presets selected above. Use presets for general guidance, and this field for specific requirements.
          </p>
        </div>

        {/* Generate Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={Play}
          disabled={disabled || !topic.trim() || !hasGenerationProvider}
          className="w-full"
        >
          Generate Newsletter
        </Button>
      </form>
    </div>
  );
};

export default GenerationForm;