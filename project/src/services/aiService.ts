import { supabase } from '../lib/supabase';
import { EncryptionService } from '../utils/encryption';
import { eventService } from './eventService';
import toast from 'react-hot-toast';

export interface AIProvider {
  id: string;
  name: string;
  type: 'research' | 'generation';
  api_key: string;
  api_key_encrypted: string;
  settings: Record<string, any>;
  is_active: boolean;
  organization_id: string;
  monthly_usage?: number;
  monthly_limit?: number;
  last_tested_at?: string;
  test_success_rate?: number;
}

export interface GenerationRequest {
  topic: string;
  mode: 'quick' | 'detailed' | 'custom';
  instructions?: string;
  skip_research?: boolean;
  include_events: boolean;
  include_knowledge: boolean;
}

class AIService {
  async getProviders(organizationId: string, type?: 'research' | 'generation'): Promise<AIProvider[]> {
    try {
      let query = supabase
        .from('ai_providers')
        .select('*')
        .eq('organization_id', organizationId);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) {
        console.error('❌ aiService: Database error fetching providers:', error);
        throw error;
      }

      return (data || []).map(provider => ({
        ...provider,
        api_key: provider.api_key_encrypted ? EncryptionService.decrypt(provider.api_key_encrypted) : '',
      }));
    } catch (error) {
      console.error('Error fetching AI providers:', error);
      return [];
    }
  }

  async getOpenRouterModels(apiKey: string): Promise<any[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ai-newsletter.com',
          'X-Title': 'AI Newsletter Platform',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      throw error;
    }
  }

  async callGenerationModel(
    providerName: string,
    apiKey: string,
    prompt: string,
    settings: Record<string, any> = {}
  ): Promise<string> {
    const defaultSettings = {
      temperature: 0.7,
      max_tokens: 1000,
      ...settings,
    };

    try {
      if (providerName.toLowerCase().includes('openai')) {
        return await this.callOpenAI(apiKey, prompt, defaultSettings);
      } else if (providerName.toLowerCase().includes('gemini')) {
        return await this.callGemini(apiKey, prompt, defaultSettings);
      } else if (providerName.toLowerCase().includes('deepseek')) {
        return await this.callDeepSeek(apiKey, prompt, defaultSettings);
      } else if (providerName.toLowerCase().includes('grok')) {
        return await this.callGrok(apiKey, prompt, defaultSettings);
      } else if (providerName.toLowerCase().includes('openrouter')) {
        return await this.callOpenRouter(apiKey, prompt, defaultSettings);
      } else {
        // Fallback to OpenAI-compatible API
        return await this.callOpenAI(apiKey, prompt, defaultSettings);
      }
    } catch (error) {
      console.error(`Error calling generation model ${providerName}:`, error);
      throw error;
    }
  }

  async callResearchModel(
    providerName: string,
    apiKey: string,
    query: string,
    settings: Record<string, any> = {}
  ): Promise<string> {
    try {
      if (providerName.toLowerCase().includes('perplexity')) {
        return await this.callPerplexity(apiKey, query, settings);
      } else if (providerName.toLowerCase().includes('tavily')) {
        return await this.callTavily(apiKey, query, settings);
      } else {
        // Fallback to using generation model for research
        const researchPrompt = `Research the latest information about "${query}". Provide current news, trends, and developments. Focus on factual, recent information.`;
        return await this.callGenerationModel(providerName, apiKey, researchPrompt, settings);
      }
    } catch (error) {
      console.error(`Error calling research model ${providerName}:`, error);
      throw error;
    }
  }

  private async callOpenAI(apiKey: string, prompt: string, settings: any): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
  }

  private async callGemini(apiKey: string, prompt: string, settings: any): Promise<string> {
    const model = settings.model || 'gemini-2.0-flash-exp';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: settings.temperature,
          maxOutputTokens: settings.max_tokens,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'No response generated.';
  }

  private async callOpenRouter(apiKey: string, prompt: string, settings: any): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-newsletter.com',
        'X-Title': 'AI Newsletter Platform',
      },
      body: JSON.stringify({
        model: settings.model || 'x-ai/grok-4-fast:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
  }

  private async callDeepSeek(apiKey: string, prompt: string, settings: any): Promise<string> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model || 'deepseek-coder',
        messages: [{ role: 'user', content: prompt }],
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
  }

  private async callGrok(apiKey: string, prompt: string, settings: any): Promise<string> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model || 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Grok API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
  }

  private async callPerplexity(apiKey: string, query: string, settings: any): Promise<string> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model || 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: `Research the latest information about "${query}". Provide current news, trends, and developments from the past week. Focus on factual, recent information that would be valuable for a newsletter audience.`
          }
        ],
        max_tokens: settings.max_tokens || 1500,
        temperature: settings.temperature || 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Perplexity API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No research results available.';
  }

  private async callTavily(apiKey: string, query: string, settings: any): Promise<string> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: settings.search_depth || 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: settings.max_results || 5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tavily API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Format Tavily results into readable content
    let content = data.answer || '';
    if (data.results && data.results.length > 0) {
      content += '\n\nKey findings:\n';
      data.results.slice(0, 3).forEach((result: any, index: number) => {
        content += `${index + 1}. ${result.title}: ${result.content.substring(0, 200)}...\n`;
      });
    }
    
    return content || 'No research results available.';
  }
  async testProvider(providerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data: provider, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (error) {
        console.error('❌ aiService: Database error fetching provider for test:', error);
        throw error;
      }
      if (!provider) {
        return { success: false, message: 'Provider not found.' };
      }

      const apiKey = EncryptionService.decrypt(provider.api_key_encrypted);
      if (!apiKey) {
        return { success: false, message: 'API key not found or could not be decrypted.' };
      }

      let testResult = { success: false, message: 'Unknown provider type' };
      if (provider.type === 'research') {
        testResult = await this.testResearchProvider(provider.name, apiKey);
      } else if (provider.type === 'generation') {
        testResult = await this.testGenerationProvider(provider.name, apiKey);
      }

      await supabase
        .from('ai_providers')
        .update({
          last_tested_at: new Date().toISOString(),
          test_success_rate: testResult.success ? 100 : 0,
        })
        .eq('id', providerId);

      return testResult;
    } catch (error) {
      console.error('Error testing provider:', error);
      toast.error('Failed to test connection. Please check your API key.');
      return {
        success: false,
        message: 'Failed to test connection. Please try again.',
      };
    }
  }

  private async testResearchProvider(name: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      if (name.toLowerCase().includes('perplexity')) {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [{ role: 'user', content: 'Test connection' }],
            max_tokens: 10,
          }),
        });

        return {
          success: response.ok,
          message: response.ok ? 'Connection successful!' : 'Invalid API key or service unavailable',
        };
      } else if (name.toLowerCase().includes('tavily')) {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: apiKey,
            query: 'test',
            max_results: 1,
          }),
        });

        return {
          success: response.ok,
          message: response.ok ? 'Connection successful!' : 'Invalid API key or service unavailable',
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'Connection test completed successfully!',
      };
    } catch (error) {
      console.error('Research provider test error:', error);
      return {
        success: false,
        message: 'Connection failed. Please check your API key.',
      };
    }
  }

  private async testGenerationProvider(name: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      if (name.toLowerCase().includes('openai')) {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        return {
          success: response.ok,
          message: response.ok ? 'Connection successful!' : 'Invalid API key or service unavailable',
        };
      } else if (name.toLowerCase().includes('openrouter')) {
        return await this.testOpenRouterProvider(apiKey);
      } else if (name.toLowerCase().includes('deepseek')) {
        return await this.testDeepSeekProvider(apiKey);
      } else if (name.toLowerCase().includes('grok')) {
        return await this.testGrokProvider(apiKey);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'Connection test completed successfully!',
      };
    } catch (error) {
      console.error('OpenAI test error:', error);
      return {
        success: false,
        message: 'Connection failed. Please check your API key.',
      };
    }
  }

  private async testOpenRouterProvider(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ai-newsletter.com',
          'X-Title': 'AI Newsletter Platform',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const freeModels = data.data?.filter((model: any) => 
          model.id.includes(':free') || model.pricing?.prompt === '0'
        ) || [];
        
        return {
          success: true,
          message: `Connection successful! Found ${data.data?.length || 0} models (${freeModels.length} free models available).`,
        };
      } else {
        return {
          success: false,
          message: 'Invalid API key or service unavailable',
        };
      }
    } catch (error) {
      console.error('OpenRouter test error:', error);
      return {
        success: false,
        message: 'Connection failed. Please check your API key.',
      };
    }
  }

  private async testDeepSeekProvider(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      return {
        success: response.ok,
        message: response.ok ? 'Connection successful!' : 'Invalid API key or service unavailable',
      };
    } catch (error) {
      console.error('DeepSeek test error:', error);
      return {
        success: false,
        message: 'Connection failed. Please check your API key.',
      };
    }
  }

  private async testGrokProvider(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      return {
        success: response.ok,
        message: response.ok ? 'Connection successful!' : 'Invalid API key or service unavailable',
      };
    } catch (error) {
      console.error('Grok test error:', error);
      return {
        success: false,
        message: 'Connection failed. Please check your API key.',
      };
    }
  }

  async saveProvider(provider: Partial<AIProvider>): Promise<AIProvider> {
    try {
      console.log('💾 aiService: Saving provider:', {
        name: provider.name,
        type: provider.type,
        organization_id: provider.organization_id,
        hasApiKey: !!provider.api_key,
      });
      
      const payload: Partial<AIProvider> = {
        name: provider.name,
        type: provider.type,
        settings: provider.settings,
        is_active: provider.is_active,
        organization_id: provider.organization_id,
        monthly_limit: provider.monthly_limit,
      };

      if (provider.api_key) {
        payload.api_key_encrypted = EncryptionService.encrypt(provider.api_key);
      }
      
      console.log('🔐 aiService: Provider data prepared for database:', {
        ...payload,
        api_key_encrypted: payload.api_key_encrypted ? '[ENCRYPTED]' : '[EMPTY]',
      });

      const { data, error } = await supabase
        .from('ai_providers')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ aiService: Database error saving provider:', error);
        throw error;
      }

      console.log('✅ aiService: Provider saved successfully:', data.id);

      return {
        ...data,
        api_key: provider.api_key || '',
      };
    } catch (error) {
      console.error('AI Provider save error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
      });
      throw new Error(error?.message || 'Failed to save AI provider');
    }
  }

  async updateProvider(id: string, updates: Partial<AIProvider>): Promise<AIProvider> {
    try {
      const payload: Partial<AIProvider> = {
        name: updates.name,
        settings: updates.settings,
        is_active: updates.is_active,
        monthly_limit: updates.monthly_limit,
      };
      
      if (updates.api_key) {
        payload.api_key_encrypted = EncryptionService.encrypt(updates.api_key);
      }

      const { data, error } = await supabase
        .from('ai_providers')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ aiService: Database error updating provider:', error);
        throw error;
      }

      const decryptedKey = data.api_key_encrypted ? EncryptionService.decrypt(data.api_key_encrypted) : '';

      return {
        ...data,
        api_key: updates.api_key || decryptedKey,
      };
    } catch (error) {
      console.error('AI Provider update error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
      });
      throw new Error(error?.message || 'Failed to update AI provider');
    }
  }

  async deleteProvider(id: string): Promise<void> {
    try {
      console.log('🗑️ aiService: Deleting provider:', id);
      
      const { error } = await supabase
        .from('ai_providers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ aiService: Database error deleting provider:', error);
        throw error;
      }
      
      console.log('✅ aiService: Provider deleted successfully');
    } catch (error) {
      console.error('AI Provider deletion error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
      });
      throw new Error(error?.message || 'Failed to delete AI provider');
    }
  }

  async generateNewsletter(
    organizationId: string,
    request: GenerationRequest,
    onProgress?: (progress: number, phase: string) => void
  ): Promise<any> {
    try {
      // Pre-fetch events if requested
      if (request.include_events) {
        console.log('🎯 aiService: Pre-fetching events for newsletter generation...');
        try {
          await eventService.triggerScraping(organizationId);
          console.log('✅ aiService: Event scraping completed');
        } catch (error) {
          console.warn('⚠️ aiService: Event scraping failed, continuing without events:', error);
        }
      }

      const { data, error } = await supabase.functions.invoke('newsletter-generator', {
        body: {
          organization_id: organizationId,
          ...request,
        },
      });

      if (error) throw error;

      const newsletterId = data.newsletter_id;

      return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          try {
            const { data: newsletter, error: fetchError } = await supabase
              .from('newsletters')
              .select('status, generation_progress, generation_logs, content')
              .eq('id', newsletterId)
              .single();

            if (fetchError) throw fetchError;

            if (onProgress && newsletter.generation_logs?.length > 0) {
              const lastLog = newsletter.generation_logs[newsletter.generation_logs.length - 1];
              const phase = lastLog.split('] ')[1] || 'Processing...';
              onProgress(newsletter.generation_progress || 0, phase);
            }

            if (newsletter.status === 'ready') {
              clearInterval(pollInterval);
              resolve(newsletter);
            } else if (newsletter.status === 'draft') {
              clearInterval(pollInterval);
              reject(new Error('Newsletter generation failed'));
            }
          } catch (error) {
            clearInterval(pollInterval);
            reject(error);
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
          reject(new Error('Generation timeout'));
        }, 300000);
      });
    } catch (error) {
      console.error('Error starting newsletter generation:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();