import React, { useState, useEffect } from 'react';
import { ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { aiService } from '../../services/aiService';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
}

interface OpenRouterModelSelectorProps {
  apiKey: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const OpenRouterModelSelector: React.FC<OpenRouterModelSelectorProps> = ({
  apiKey,
  selectedModel,
  onModelChange,
}) => {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      fetchModels();
    }
  }, [apiKey]);

  const fetchModels = async () => {
    if (!apiKey || !apiKey.trim()) {
      setError('API key is required to fetch models');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const fetchedModels = await aiService.getOpenRouterModels(apiKey);
      
      // Filter and sort models for better UX
      const filteredModels = (fetchedModels || [])
        .filter(model => model.id && !model.id.includes('moderation'))
        .sort((a, b) => {
          // Prioritize free models first, then popular models
          const aIsFree = a.id.includes(':free') || a.pricing?.prompt === '0';
          const bIsFree = b.id.includes(':free') || b.pricing?.prompt === '0';
          
          if (aIsFree && !bIsFree) return -1;
          if (!aIsFree && bIsFree) return 1;
          
          const popularModels = ['x-ai/grok', 'openai/gpt-4', 'openai/gpt-3.5-turbo', 'anthropic/claude', 'google/gemini'];
          const aPopular = popularModels.some(popular => a.id.includes(popular));
          const bPopular = popularModels.some(popular => b.id.includes(popular));
          
          if (aPopular && !bPopular) return -1;
          if (!aPopular && bPopular) return 1;
          
          return a.name?.localeCompare(b.name || '') || 0;
        });

      setModels(filteredModels);
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      setError('Failed to fetch models. Please check your API key.');
      
      // Set default models as fallback
      setModels([
        { id: 'x-ai/grok-4-fast:free', name: 'Grok 4 Fast (Free)', pricing: { prompt: '0', completion: '0' } },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)', pricing: { prompt: '0', completion: '0' } },
        { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini (Free)', pricing: { prompt: '0', completion: '0' } },
        { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', pricing: { prompt: '0', completion: '0' } },
        { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        { id: 'openai/gpt-4', name: 'GPT-4' },
        { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
        { id: 'google/gemini-pro', name: 'Gemini Pro' },
        { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectedModelData = models.find(model => model.id === selectedModel);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        OpenRouter Model
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-left flex items-center justify-between"
          disabled={loading}
        >
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Loading models...</span>
              </div>
            ) : selectedModelData ? (
              <div>
                <div className="font-medium">{selectedModelData.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedModelData.id}
                </div>
              </div>
            ) : (
              <span className="text-gray-500">Select a model...</span>
            )}
          </div>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            {error ? (
              <div className="p-3 text-center">
                <AlertCircle size={16} className="mx-auto text-red-500 mb-2" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={fetchModels}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : models.length > 0 ? (
              <div className="py-1">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{model.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {model.id}
                    </div>
                    {model.pricing && (
                      <div className={`text-xs ${
                        model.pricing.prompt === '0' || model.id.includes(':free')
                          ? 'text-green-600 dark:text-green-400 font-medium'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {model.pricing.prompt === '0' || model.id.includes(':free')
                          ? 'FREE'
                          : `$${model.pricing.prompt}/1K prompt • $${model.pricing.completion}/1K completion`
                        }
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                No models available
              </div>
            )}
          </div>
        )}
      </div>

      {selectedModelData?.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {selectedModelData.description}
        </p>
      )}

      {!apiKey && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
          Enter your API key above to load available models
        </p>
      )}
    </div>
  );
};

export default OpenRouterModelSelector;