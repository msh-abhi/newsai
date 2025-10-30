/*
 # Newsletter Generation Edge Function
 
 Complete AI-powered newsletter generation pipeline with robust fallback system:
 1. Topic Analysis & Content Planning (with fallback across generation models)
 2. Research Orchestration (with fallback across research APIs)
 3. Knowledge Base Query (vector search)
 4. Event Collection (placeholder for now)
 5. Section Generation (parallel AI content creation with fallback)
 6. Brand Integration (apply styling and voice)
 7. Quality Validation (basic checks)
 8. Draft Assembly (combine into final structure)
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GenerationRequest {
  organization_id: string;
  topic: string;
  mode: 'quick' | 'detailed' | 'custom';
  instructions?: string;
  skip_research?: boolean;
  num_sections?: number;
  section_length?: 'short' | 'medium' | 'long';
  include_images?: boolean;
  image_source?: 'ai' | 'web';
  image_placement?: 'all' | 'header';
  include_events: boolean;
  include_knowledge: boolean;
  tone?: string;
  style?: string;
  audience?: string;
  context?: string;
  guide?: string;
}

interface AIProvider {
  id: string;
  name: string;
  type: 'research' | 'generation';
  api_key_encrypted: string;
  api_key?: string;
  settings: Record<string, any>;
  is_active: boolean;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: string;
}

interface BrandConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  font_family: string;
  template: string;
  logo_url?: string;
  footer_text?: string;
}

interface NewsletterSection {
  id: string;
  type: 'hero' | 'article' | 'events' | 'knowledge' | 'summary';
  title: string;
  content: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Newsletter Generator: Function invoked');
    console.log('📋 Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      supabaseUrlPrefix: Deno.env.get('SUPABASE_URL')?.substring(0, 20) + '...',
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: GenerationRequest = await req.json();
    console.log('🚀 Starting newsletter generation for:', request.topic);
    console.log('📋 Request details:', {
      organization_id: request.organization_id,
      mode: request.mode,
      include_events: request.include_events,
      include_knowledge: request.include_knowledge,
      skip_research: request.skip_research,
    });

    const { data: newsletter, error: createError } = await supabase
      .from('newsletters')
      .insert({
        organization_id: request.organization_id,
        title: `Newsletter: ${request.topic}`,
        content: {},
        status: 'generating',
        generation_progress: 0,
        generation_logs: [`[${new Date().toISOString()}] Starting generation for topic: ${request.topic}`],
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create newsletter record:', createError);
      throw createError;
    }

    console.log('✅ Newsletter record created:', newsletter.id);

    generateNewsletterContent(supabase, newsletter.id, request).catch(error => {
      console.error('❌ Background generation process failed:', error);
    });

    return new Response(
      JSON.stringify({ newsletter_id: newsletter.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Newsletter generation request error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateNewsletterContent(supabase: any, newsletterId: string, request: GenerationRequest) {
  const updateProgress = async (progress: number, phase: string, logs: string[] = []) => {
    const newLog = `[${new Date().toISOString()}] ${phase}`;
    const allLogs = [...logs, newLog];
    
    await supabase
      .from('newsletters')
      .update({
        generation_progress: progress,
        generation_logs: allLogs,
      })
      .eq('id', newsletterId);
    
    return allLogs;
  };

  let logs: string[] = [];

  try {
    logs = await updateProgress(5, 'Fetching AI providers and brand configuration...');
    
    const { providers, brandConfig } = await fetchConfiguration(supabase, request.organization_id);
    
    if (!providers.generation.length) {
      throw new Error('No generation AI providers configured');
    }

    console.log('📋 Available providers:', {
      generation: providers.generation.map(p => p.name),
      research: providers.research.map(p => p.name),
    });

    logs = await updateProgress(15, 'Analyzing topic and planning newsletter structure...', logs);
    
    const contentPlan = await tryProviders(
      providers.generation,
      async (provider) => await analyzeTopicAndPlan(provider, request),
      'Topic analysis'
    );
    
    let researchResults = '';
    if (!request.skip_research && providers.research.length > 0) {
      logs = await updateProgress(30, 'Conducting web research on the topic...', logs);
      
      try {
        researchResults = await tryProviders(
          providers.research,
          async (provider) => await conductResearch(provider, request.topic),
          'Research'
        );
      } catch (error) {
        console.warn('Research failed with all providers, continuing without research data:', error);
        logs = await updateProgress(35, 'Research unavailable, continuing with knowledge base only...', logs);
      }
    } else if (request.skip_research) {
      logs = await updateProgress(35, 'Skipping web research as requested...', logs);
    }

    let knowledgeContent: KnowledgeItem[] = [];
    if (request.include_knowledge) {
      logs = await updateProgress(45, 'Querying knowledge base for relevant content...', logs);
      knowledgeContent = await queryKnowledgeBase(supabase, request.organization_id, request.topic);
    }

    logs = await updateProgress(70, 'Generating newsletter sections with AI...', logs);
    
    const sections = await generateSections(
      supabase,
      providers.generation, 
      contentPlan, 
      researchResults, 
      knowledgeContent, 
      request
    );

    logs = await updateProgress(85, 'Applying brand styling and voice...', logs);
    
    const brandedSections = await applyBrandIntegration(sections, brandConfig, request.topic);

    logs = await updateProgress(95, 'Validating content quality and completeness...', logs);
    
    const validatedSections = await validateContent(brandedSections);

    logs = await updateProgress(100, 'Assembling final newsletter draft...', logs);
    
    const finalContent = {
      header: {
        title: contentPlan.title || `${request.topic} - Weekly Update`,
        subtitle: contentPlan.subtitle || `Latest insights and updates on ${request.topic}`,
        date: new Date().toISOString().split('T')[0],
        logoUrl: brandConfig.logo_url,
      },
      sections: validatedSections,
      footer: {
        text: brandConfig.footer_text || `© ${new Date().getFullYear()} ${contentPlan.title || request.topic}. All rights reserved.`,
        links: [
          { text: 'Unsubscribe', url: '#' },
          { text: 'Privacy Policy', url: '#' },
          { text: 'Contact Us', url: '#' },
        ],
      },
    };

    await supabase
      .from('newsletters')
      .update({
        status: 'ready',
        generation_progress: 100,
        content: finalContent,
        title: finalContent.header.title,
        generation_logs: [...logs, `[${new Date().toISOString()}] Newsletter generation completed successfully!`],
      })
      .eq('id', newsletterId);

    console.log('✅ Newsletter generation completed successfully');

  } catch (error) {
    console.error('❌ Generation process error:', error);
    
    await supabase
      .from('newsletters')
      .update({
        status: 'draft',
        generation_logs: [...logs, `[${new Date().toISOString()}] Generation failed: ${error.message}`],
      })
      .eq('id', newsletterId);
  }
}

async function tryProviders<T>(
  providers: AIProvider[],
  operation: (provider: AIProvider) => Promise<T>,
  operationName: string
): Promise<T> {
  if (!providers || providers.length === 0) {
    throw new Error(`No ${operationName.toLowerCase()} providers available`);
  }

  console.log(`🔄 Starting ${operationName} with ${providers.length} providers available`);
  
  let lastError: Error | null = null;
  
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    
    if (!provider.api_key || provider.api_key.trim() === '') {
      console.warn(`⚠️ Skipping provider ${provider.name}: No API key configured`);
      continue;
    }
    
    try {
      console.log(`🔄 Trying ${operationName} with provider: ${provider.name} (${i + 1}/${providers.length})`);
      const result = await operation(provider);
      console.log(`✅ ${operationName} successful with provider: ${provider.name}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`❌ ${operationName} failed with provider ${provider.name}:`, errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (errorMessage.includes('exceeded your current quota') ||
          errorMessage.includes('Insufficient Balance') ||
          errorMessage.includes('You exceeded your current quota') ||
          errorMessage.includes('billing') ||
          errorMessage.includes('403') ||
          errorMessage.includes('401')) {
        console.warn(`⚠️ Provider ${provider.name} has account/billing issues. Please check your billing dashboard and ensure your account has available credits.`);
      }
      
      if (i < providers.length - 1) {
        console.log(`🔄 Trying next provider for ${operationName}...`);
        continue;
      }
    }
  }
  
  throw new Error(`${operationName} failed with all available providers. Last error: ${lastError?.message}`);
}

async function fetchConfiguration(supabase: any, organizationId: string) {
  const { data: aiProviders, error: aiError } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (aiError) throw aiError;

  const providers = {
    research: aiProviders
      .filter((p: AIProvider) => p.type === 'research')
      .map(decryptProvider)
      .filter((p: AIProvider) => p.api_key),
    generation: aiProviders
      .filter((p: AIProvider) => p.type === 'generation')
      .map(decryptProvider)
      .filter((p: AIProvider) => p.api_key),
  };

  console.log('🔑 Decrypted providers:', {
    research: providers.research.map(p => ({ name: p.name, hasKey: !!p.api_key })),
    generation: providers.generation.map(p => ({ name: p.name, hasKey: !!p.api_key })),
  });

  const { data: brandData, error: brandError } = await supabase
    .from('brand_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  const brandConfig: BrandConfig = brandData || {
    colors: { primary: '#3B82F6', secondary: '#8B5CF6', accent: '#F97316' },
    font_family: 'Inter',
    template: 'modern',
    logo_url: '',
    footer_text: '',
  };

  return { providers, brandConfig };
}

function decryptProvider(provider: AIProvider): AIProvider {
  try {
    const decryptedKey = provider.api_key_encrypted ? atob(provider.api_key_encrypted) : '';
    return {
      ...provider,
      api_key: decryptedKey,
    };
  } catch (error) {
    console.warn(`Failed to decrypt API key for provider ${provider.name}:`, error);
    return { ...provider, api_key: '' };
  }
}

function buildPresetModifiers(request: GenerationRequest): string {
  const modifiers: string[] = [];

  const TONE_PRESETS: Record<string, string> = {
    professional: 'Use a professional, authoritative tone. Maintain formal language, clear structure, and business-appropriate vocabulary. Be confident and credible.',
    conversational: 'Use a conversational, friendly tone as if speaking directly to a trusted colleague. Be warm, approachable, and engaging while maintaining professionalism. Use natural language and relatable examples.',
    educational: 'Use an educational, instructive tone. Break down complex concepts clearly, provide helpful examples, and guide readers through information step-by-step. Be patient and thorough.',
    persuasive: 'Use a persuasive, compelling tone. Emphasize benefits, create urgency when appropriate, and motivate readers to take action. Be confident and results-focused.',
    inspirational: 'Use an inspirational, uplifting tone. Empower readers, highlight possibilities, and create enthusiasm. Be positive, energizing, and vision-focused.'
  };

  const STYLE_PRESETS: Record<string, string> = {
    concise: 'Write in a concise, efficient style. Use short paragraphs (2-4 sentences), bullet points where appropriate, and get to the point quickly. Eliminate unnecessary words. Each section should be focused and scannable.',
    detailed: 'Write in a detailed, comprehensive style. Provide thorough explanations, relevant context, supporting examples, and deeper analysis. Use longer paragraphs (4-6 sentences) to fully explore topics.',
    story_driven: 'Write in a story-driven, narrative style. Use anecdotes, case studies, real-world examples, and storytelling techniques to illustrate points. Create a narrative arc that engages readers emotionally.',
    data_driven: 'Write in a data-driven, analytical style. Emphasize facts, statistics, research findings, and evidence-based insights. Use numbers, percentages, and concrete data points to support claims.',
    action_oriented: 'Write in an action-oriented, practical style. Focus on actionable takeaways, implementation steps, and concrete next actions. Include "how-to" elements and clear calls-to-action throughout.'
  };

  const AUDIENCE_PRESETS: Record<string, string> = {
    beginners: 'Write for beginners who are new to this topic. Avoid jargon or explain it when necessary. Provide foundational context, define key terms, and don\'t assume prior knowledge. Use clear, simple language.',
    professionals: 'Write for working professionals with moderate expertise. Assume basic familiarity with the field but explain advanced concepts. Balance accessibility with depth. Focus on practical applications relevant to their work.',
    executives: 'Write for executives and senior decision-makers. Focus on strategic implications, business impact, and high-level insights. Be concise and emphasize ROI, competitive advantages, and organizational outcomes.',
    general: 'Write for a general audience with varied backgrounds. Use accessible language, explain specialized terms, and provide context. Make content engaging and relevant to everyday life or common interests.',
    technical: 'Write for technical experts with deep domain knowledge. Use industry-specific terminology, dive into technical details, discuss nuances, and provide advanced insights. Assume high level of expertise.'
  };

  const CONTEXT_PRESETS: Record<string, string> = {
    industry_news: 'Frame content as industry news and current developments. Focus on what\'s new, what\'s changing, and why it matters now. Include timely insights and immediate relevance.',
    how_to: 'Structure content as a how-to guide or tutorial. Provide clear step-by-step instructions, actionable advice, and practical implementation guidance. Focus on teaching readers how to do something specific.',
    trend_analysis: 'Present content as trend analysis. Identify patterns, analyze implications, discuss future directions, and provide forward-looking insights. Help readers understand where things are heading.',
    product_updates: 'Frame content as product updates and announcements. Highlight new features, improvements, benefits, and practical use cases. Focus on what\'s new and how it helps users.',
    educational_series: 'Present content as part of an educational series. Build on foundational concepts, create learning progression, and help readers develop deeper understanding over time. Reference how this fits into broader learning.'
  };

  const GUIDE_PRESETS: Record<string, string> = {
    standard: 'Use standard newsletter structure with clear sections, balanced content distribution, and logical flow from introduction through main points to conclusion.',
    highlight_focused: 'Lead with key highlights and main takeaways upfront. Put the most important information first, then provide supporting details and context.',
    deep_dive: 'Structure as a deep dive into a single major topic. Provide comprehensive coverage, multiple angles, and thorough exploration rather than covering multiple separate topics.',
    curated_list: 'Structure as a curated list or roundup. Present multiple distinct items, resources, or insights with concise explanations for each. Make it scannable and easy to navigate.',
    problem_solution: 'Structure using problem-solution framework. Clearly identify challenges or pain points, then provide practical solutions, approaches, or strategies to address them.'
  };

  if (request.tone && TONE_PRESETS[request.tone]) {
    modifiers.push(`TONE: ${TONE_PRESETS[request.tone]}`);
  }

  if (request.style && STYLE_PRESETS[request.style]) {
    modifiers.push(`STYLE: ${STYLE_PRESETS[request.style]}`);
  }

  if (request.audience && AUDIENCE_PRESETS[request.audience]) {
    modifiers.push(`AUDIENCE: ${AUDIENCE_PRESETS[request.audience]}`);
  }

  if (request.context && CONTEXT_PRESETS[request.context]) {
    modifiers.push(`CONTEXT: ${CONTEXT_PRESETS[request.context]}`);
  }

  if (request.guide && GUIDE_PRESETS[request.guide]) {
    modifiers.push(`STRUCTURE: ${GUIDE_PRESETS[request.guide]}`);
  }

  return modifiers.length > 0 ? `\n\nCUSTOMIZATION REQUIREMENTS (PRIORITY LEVEL 2 - Apply these guidelines):\n${modifiers.join('\n\n')}` : '';
}

async function analyzeTopicAndPlan(provider: AIProvider, request: GenerationRequest) {
  const sectionsCount = request.num_sections || 4;

  const presetModifiers = buildPresetModifiers(request);

  const prompt = `You are an expert newsletter content strategist. Analyze the topic "${request.topic}" and create an engaging, reader-friendly newsletter content plan.

CONTENT STRATEGY:
- Mode: ${request.mode}
- Sections needed: ${sectionsCount}
- Section length: ${request.section_length || 'medium'}
- Research included: ${!request.skip_research ? 'Yes' : 'No'}

TITLE GENERATION REQUIREMENTS:
- Create a SPECIFIC, COMPELLING title that directly relates to "${request.topic}"
- Transform the user's topic into an engaging headline, not a literal repetition
- Make it promise clear value to readers (e.g., "5 Game-Changing AI Tools That Will Transform Your Workflow" instead of "AI Tools Newsletter")
- Use action words, numbers, or benefit-focused language when appropriate
- Avoid generic phrases like "Weekly Update" or "Latest News"
- The title should be catchy and make readers want to open the newsletter

CONTENT APPROACH:
Based on the topic "${request.topic}", determine the most engaging format:
- If it's about "how to" or "ways to" → Create actionable step-by-step guidance
- If it's about "top X" or "best" → Create curated lists with explanations
- If it's about trends or news → Create insightful analysis with takeaways
- If it's about making money → Focus on practical strategies and real examples
- If it's educational → Break down complex concepts into digestible insights

NEWSLETTER CONTINUITY - CRITICAL:
This is ONE cohesive newsletter document, not separate emails or blog posts:
- Sections are chapters in a continuous narrative that build upon each other
- Each section should reference or build upon previous sections where appropriate
- Avoid repetitive introductions or re-explaining the same concepts
- Create a flow where section 2 naturally follows section 1, section 3 builds on sections 1-2, etc.
- Think of it as a magazine article with multiple sections, not standalone pieces
- DO NOT use greetings like "Hey there", "Hello", "Welcome" in individual sections
- Only the newsletter header should have a greeting if needed${presetModifiers}

SECTION PLANNING GUIDELINES:
- Each section should explore a DIFFERENT aspect or angle of the topic
- Avoid creating sections with nearly identical titles or purposes
- Create variety: mix explanations, examples, how-tos, lists, and insights
- Ensure sections complement each other and create a complete narrative
- Plan transitions so sections feel connected, not isolated
${request.instructions ? `\n\nADDITIONAL USER INSTRUCTIONS (Supplement the above):\n${request.instructions}` : ''}

CRITICAL REQUIREMENTS:
- Create exactly ${sectionsCount} sections (no more, no fewer)
- Make the title compelling, specific, and directly related to "${request.topic}"
- Each section must provide UNIQUE value (not repeat the same information)
- Plan sections as parts of ONE cohesive document
- Create a logical progression from introduction through main content to conclusion

Respond with valid JSON only:
{
  "title": "Compelling, specific title directly about ${request.topic} that promises clear value",
  "subtitle": "Clear subtitle that explains exactly what readers will learn",
  "sections": [
    {
      "type": "hero",
      "title": "Engaging section title (introductory)",
      "description": "Opens the newsletter and introduces the main theme"
    },
    {
      "type": "article",
      "title": "Second section title (builds on intro)",
      "description": "Expands on the introduction with specific details or first major point"
    },
    {
      "type": "article",
      "title": "Third section title (advances the narrative)",
      "description": "Introduces new angle or complementary information"
    },
    {
      "type": "article",
      "title": "Final section title (synthesizes or concludes)",
      "description": "Brings together insights or provides actionable next steps"
    }
  ],
  "tone": "conversational|professional|casual|educational",
  "target_audience": "Who will benefit most from this content",
  "content_approach": "actionable_guide|curated_list|insightful_analysis|educational_breakdown"
}`;

  try {
    const response = await callAIProvider(provider, prompt, { temperature: 0.7, max_tokens: 1000 });
    const parsed = JSON.parse(response);
    
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid response: sections array missing');
    }
    
    while (parsed.sections.length < sectionsCount) {
      const sectionNumber = parsed.sections.length + 1;
      parsed.sections.push({
        type: sectionNumber === 1 ? 'hero' : 'article',
        title: `${request.topic} Update #${sectionNumber}`,
        description: `Additional content about ${request.topic} (${request.section_length || 'medium'} length)`
      });
    }
    
    if (parsed.sections.length > sectionsCount) {
      parsed.sections = parsed.sections.slice(0, sectionsCount);
    }
    
    console.log(`✅ Content plan validated: ${parsed.sections.length} sections generated`);
    return parsed;
  } catch (error) {
    console.error(`Topic analysis failed with ${provider.name}:`, error instanceof Error ? error.message : String(error));
    
    const topicLower = request.topic.toLowerCase();
    let fallbackTitle = '';
    let fallbackSubtitle = '';
    let contentApproach: string = 'informative';

    if (topicLower.includes('how to') || topicLower.includes('ways to')) {
      fallbackTitle = `Complete Guide: ${request.topic}`;
      fallbackSubtitle = `Step-by-step strategies to master ${request.topic}`;
      contentApproach = 'actionable_guide';
    } else if (topicLower.includes('top ') || topicLower.includes('best ')) {
      fallbackTitle = `${request.topic} - Expert Picks`;
      fallbackSubtitle = `Hand-selected recommendations and insights`;
      contentApproach = 'curated_list';
    } else if (topicLower.includes('trends') || topicLower.includes('future')) {
      fallbackTitle = `${request.topic}: What's Coming Next`;
      fallbackSubtitle = `Analysis and predictions for the future`;
      contentApproach = 'insightful_analysis';
    } else if (topicLower.includes('money') || topicLower.includes('profit') || topicLower.includes('income')) {
      fallbackTitle = `Proven Strategies: ${request.topic}`;
      fallbackSubtitle = `Real tactics and actionable steps to succeed`;
      contentApproach = 'actionable_guide';
    } else {
      fallbackTitle = `Essential Insights: ${request.topic}`;
      fallbackSubtitle = `Everything you need to know about ${request.topic}`;
      contentApproach = 'educational_breakdown';
    }
    
    const fallbackSections = [];
    for (let i = 0; i < sectionsCount; i++) {
      const sectionType = i === 0 ? 'hero' : 'article';
      
      let defaultTitle = '';
      let defaultDescription = '';
      
      if (contentApproach === 'actionable_guide') {
        defaultTitle = `Step ${i + 1}: ${request.topic}`;
        defaultDescription = `Practical step-by-step guidance for ${request.topic}`;
      } else if (contentApproach === 'curated_list') {
        defaultTitle = `${request.topic} - Part ${i + 1}`;
        defaultDescription = `Curated insights and recommendations for ${request.topic}`;
      } else {
        defaultTitle = `${request.topic} - Key Insight #${i + 1}`;
        defaultDescription = `Important information and takeaways about ${request.topic}`;
      }
      
      fallbackSections.push({
        type: sectionType,
        title: defaultTitle,
        description: defaultDescription
      });
    }
    
    console.log(`🔄 Using fallback plan with ${sectionsCount} sections`);
    
    return {
      title: fallbackTitle,
      subtitle: fallbackSubtitle,
      sections: fallbackSections,
      tone: 'conversational',
      target_audience: 'Professionals and enthusiasts seeking practical insights',
      content_approach: contentApproach,
    };
  }
}

async function conductResearch(provider: AIProvider, topic: string): Promise<string> {
  const providerName = provider.name.toLowerCase();
  
  if (providerName.includes('perplexity')) {
    return await callPerplexityAPI(provider.api_key, topic);
  } else if (providerName.includes('tavily')) {
    return await callTavilyAPI(provider.api_key, topic);
  } else if (providerName.includes('serpapi')) {
    return await callSerpAPI(provider.api_key, topic);
  } else {
    const prompt = `Research the latest information about "${topic}". Provide current news, trends, and developments from the past week. Focus on factual, recent information that would be valuable for a newsletter audience. Include specific examples, statistics, and actionable insights.`;
    return await callAIProvider(provider, prompt, { temperature: 0.3, max_tokens: 1500 });
  }
}

async function callPerplexityAPI(apiKey: string, topic: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'user',
          content: `Research the latest information about "${topic}". Provide current news, trends, and developments from the past week. Focus on factual, recent information that would be valuable for a newsletter audience.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Perplexity API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No research results available.';
}

async function callTavilyAPI(apiKey: string, topic: string): Promise<string> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: `Latest news and developments about ${topic} in the past week`,
      search_depth: 'advanced',
      include_answer: true,
      include_raw_content: false,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Tavily API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  
  let content = data.answer || '';
  if (data.results && data.results.length > 0) {
    content += '\n\nKey findings:\n';
    data.results.slice(0, 3).forEach((result: any, index: number) => {
      content += `${index + 1}. ${result.title}: ${result.content.substring(0, 200)}...\n`;
    });
  }
  
  return content || 'No research results available.';
}

async function callSerpAPI(apiKey: string, topic: string): Promise<string> {
  const response = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(`${topic} news latest week`)}&api_key=${apiKey}&num=5`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`SerpAPI error: ${response.status} - ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  
  let content = `Recent search results for "${topic}":\n\n`;
  
  if (data.organic_results && data.organic_results.length > 0) {
    data.organic_results.slice(0, 5).forEach((result: any, index: number) => {
      content += `${index + 1}. ${result.title}\n`;
      if (result.snippet) {
        content += `    ${result.snippet}\n`;
      }
      content += `    Source: ${result.link}\n\n`;
    });
  }
  
  return content || 'No search results available.';
}

async function queryKnowledgeBase(supabase: any, organizationId: string, topic: string): Promise<KnowledgeItem[]> {
  try {
    const { data, error } = await supabase.functions.invoke('vector-search', {
      body: {
        query: topic,
        organization_id: organizationId,
        limit: 5,
      },
    });

    if (error) {
      console.error('Vector search error:', error);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('knowledge_items')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`title.ilike.%${topic}%,content.ilike.%${topic}%`)
        .limit(5);

      return fallbackError ? [] : (fallbackData || []);
    }

    return data?.results || [];
  } catch (error) {
    console.error('Knowledge base query failed:', error);
    return [];
  }
}

async function generateSections(
  supabase: any,
  providers: AIProvider[],
  contentPlan: any,
  researchResults: string,
  knowledgeContent: KnowledgeItem[],
  request: GenerationRequest
): Promise<NewsletterSection[]> {
  const sections: NewsletterSection[] = [];
  
  let eventsContent: any[] = [];
  if (request.include_events) {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', request.organization_id)
        .gte('date_start', new Date().toISOString())
        .order('relevance_score', { ascending: false })
        .limit(10);
      
      if (!error && events) {
        eventsContent = events;
        console.log(`📅 Found ${events.length} relevant events for newsletter`);
      }
    } catch (error) {
      console.warn('Failed to fetch events for newsletter:', error);
    }
  }

  const requestedSections = request.num_sections || 4;
  const sectionsToGenerate = contentPlan.sections.slice(0, requestedSections);
  
  console.log(`📝 Generating ${sectionsToGenerate.length} sections (requested: ${requestedSections})`);
  
  const tokenMap = {
    short: 300,
    medium: 600,
    long: 900,
  };
  const maxTokens = tokenMap[request.section_length || 'medium'];

  for (let i = 0; i < sectionsToGenerate.length; i++) {
    const sectionPlan = sectionsToGenerate[i];
    
    console.log(`🔄 Generating section ${i + 1}/${sectionsToGenerate.length}: ${sectionPlan.title}`);
    
    const contextInfo = [
      `Newsletter Topic: ${request.topic}`,
      `Section Focus: ${sectionPlan.title}`,
      `Section Goal: ${sectionPlan.description}`,
      `Content Approach: ${contentPlan.content_approach || 'informative'}`,
      `Writing Tone: ${contentPlan.tone}`,
      `Target Readers: ${contentPlan.target_audience}`,
    ];

    if (researchResults) {
      contextInfo.push(`Web Research Insights: ${researchResults.substring(0, 1000)}...`);
    }

    if (knowledgeContent.length > 0) {
      const relevantKnowledge = knowledgeContent
        .slice(0, 2)
        .map(k => `${k.title}: ${k.content.substring(0, 300)}...`)
        .join('\n');
      contextInfo.push(`Your Knowledge Base: ${relevantKnowledge}`);
    }

    if (eventsContent.length > 0) {
      const relevantEvents = eventsContent
        .slice(0, 3)
        .map(e => `${e.title} - ${new Date(e.date_start).toLocaleDateString()} at ${e.location || 'TBD'}`)
        .join('\n');
      contextInfo.push(`Relevant Upcoming Events: ${relevantEvents}`);
    }

    const previousSections = sections.map((s, idx) => `Section ${idx + 1}: ${s.title}`).join('; ');
    const sectionPosition = i === 0 ? 'OPENING/INTRODUCTION' : i === sectionsToGenerate.length - 1 ? 'CLOSING/CONCLUSION' : `MIDDLE SECTION ${i + 1}`;

    const presetModifiers = buildPresetModifiers(request);

    const prompt = `You are an expert newsletter writer creating engaging, valuable content for readers. Write section ${i + 1} of ${sectionsToGenerate.length} for this newsletter.

${contextInfo.join('\n')}

NEWSLETTER CONTEXT AND CONTINUITY - CRITICAL:
- This is section ${i + 1} of ${sectionsToGenerate.length} in ONE cohesive newsletter document
- Position in newsletter: ${sectionPosition}
${previousSections ? `- Previous sections covered: ${previousSections}` : '- This is the first section'}
- Build upon what came before, don't repeat it
- Create natural flow and progression through the narrative
- Each section should provide UNIQUE value and explore DIFFERENT aspects
- Think of this as a chapter in a continuous story, not a standalone piece
- Avoid re-introducing the topic - readers already know what this newsletter is about

CRITICAL FORMATTING REQUIREMENTS:
- Output content in clean HTML format using proper tags
- Use <p></p> tags for each paragraph (2-6 sentences per paragraph based on style)
- Use <ul><li></li></ul> for bullet points when listing items
- Use <ol><li></li></ol> for numbered lists when showing steps
- Use <strong></strong> for emphasis and important points
- Use <em></em> for subtle emphasis or quotes
- Add proper spacing with <br> only when transitioning between major concepts
- Ensure each paragraph is wrapped in <p> tags for proper email rendering
- Do NOT use markdown formatting (no **, *, #, etc.)
- Do NOT include "html", "Default", or meta-text in the output

SECTION-AWARE WRITING RULES:
${i === 0 ? `- As the OPENING section, set the stage and hook readers
- Introduce the main theme naturally without "Hey there" or "Welcome"
- Start with a compelling statement, question, or insight
- Preview the value readers will get from this newsletter` : ''}
${i > 0 && i < sectionsToGenerate.length - 1 ? `- As a MIDDLE section, advance the narrative
- Build on insights from previous sections
- Explore a new angle or aspect of the topic
- Provide specific, actionable information
- Maintain momentum and reader engagement` : ''}
${i === sectionsToGenerate.length - 1 ? `- As the CLOSING section, synthesize and conclude
- Tie together insights from earlier sections
- Provide clear takeaways or next steps
- End with impact - leave readers with something valuable
- Include a call-to-action if appropriate` : ''}

TONE AND STYLE CONTROL:
- Maintain a ${contentPlan.tone} writing tone throughout
- Write as if speaking directly to one person, not a crowd
- Use active voice and action-oriented language
- Include specific examples and concrete details
- Make complex topics accessible and engaging
- Avoid corporate jargon and buzzwords unless audience requires it
- Vary paragraph length for rhythm (but respect style preset)
- Use transitions to connect ideas smoothly${presetModifiers}

CRITICAL: DO NOT USE GREETINGS OR REPETITIVE INTRODUCTIONS:
- DO NOT start with greetings like "Hey there", "Hello", "Welcome", "Hi everyone", etc.
- DO NOT include phrases like "Let's dive in", "Let's get started", "Here we go", "Today we're going to"
- DO NOT re-introduce the newsletter topic as if readers just arrived
- Start directly with the content - this is section ${i + 1}, not a new conversation
- Each section flows naturally as part of a continuous document
- Only use transitional phrases that connect to previous content, not generic openings

WORD COUNT FLEXIBILITY:
- Target length: ${request.section_length || 'medium'} (${request.section_length === 'short' ? '100-250 words' : request.section_length === 'long' ? '350-600 words' : '200-400 words'})
- Allow natural variation - not all sections need identical length
- Opening sections may be shorter to hook readers quickly
- Middle sections can be longer if content demands depth
- Closing sections should be impactful, not necessarily longest
- Quality and value matter more than hitting exact word counts
${request.instructions ? `\n\nADDITIONAL USER INSTRUCTIONS (PRIORITY LEVEL 3 - Supplements presets and guidelines):\n${request.instructions}` : ''}

CONTENT STRUCTURE EXAMPLE:
<p>Opening paragraph that hooks the reader and introduces this section's focus (without re-introducing the entire newsletter).</p>

<p>Second paragraph that expands on the concept with specific details, examples, or data points.</p>

<ul>
<li>First key point or actionable insight</li>
<li>Second key point with concrete example</li>
<li>Third key point or practical application</li>
</ul>

<p>Concluding paragraph that provides clear takeaway and naturally transitions to what might come next (if not final section).</p>

Write the section content for: "${sectionPlan.title}"
Goal: ${sectionPlan.description}

Remember: Output ONLY the HTML content, no additional text, explanations, or meta-commentary.`;

    try {
      const content = await tryProviders(
        providers,
        async (provider) => await callAIProvider(provider, prompt, { temperature: 0.7, max_tokens: maxTokens }),
        `Section ${i + 1} generation`
      );

      const shouldIncludeImage = request.include_images && (
        request.image_placement === 'all' || (request.image_placement === 'header' && i === 0)
      );

      let imageUrl: string | undefined;
      if (shouldIncludeImage) {
        if (request.image_source === 'ai') {
          imageUrl = await generateImageWithAI(providers, sectionPlan.title, request.topic);
        } else {
          imageUrl = await fetchWebImage(sectionPlan.title, request.topic);
        }
      }

      sections.push({
        id: `section-${i + 1}`,
        type: sectionPlan.type,
        title: sectionPlan.title,
        content: content.trim(),
        imageUrl: imageUrl,
        metadata: {
          generated_at: new Date().toISOString(),
          section_plan: sectionPlan,
        },
      });
    } catch (error) {
      console.error(`Failed to generate section ${i + 1} with all providers:`, error);

      const shouldIncludeImage = request.include_images && (
        request.image_placement === 'all' || (request.image_placement === 'header' && i === 0)
      );

      let imageUrl: string | undefined;
      if (shouldIncludeImage) {
        imageUrl = getDefaultImageForSection(sectionPlan.type, request.topic);
      }

      sections.push({
        id: `section-${i + 1}`,
        type: sectionPlan.type,
        title: sectionPlan.title,
        content: `<p>This section about ${sectionPlan.title} is being prepared.</p><p>${sectionPlan.description}</p>`,
        imageUrl: imageUrl,
        metadata: {
          generated_at: new Date().toISOString(),
          fallback_used: true,
          error: error.message,
        },
      });
    }
  }

  return sections;
}

function getDefaultImageForSection(type: string, topic: string): string {
  const imageMap: Record<string, string> = {
    hero: 'https://images.pexels.com/photos/3985062/pexels-photo-3985062.jpeg?auto=compress&cs=tinysrgb&w=800',
    article: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=800',
    events: 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=800',
    knowledge: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800',
    summary: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800',
  };

  return imageMap[type] || imageMap.article;
}

async function fetchWebImage(sectionTitle: string, topic: string): Promise<string> {
  console.log('Using royalty-free stock image from Pexels');
  return getImageForTopic(topic, sectionTitle);
}

function getImageForTopic(topic: string, sectionTitle: string): string {
  const topicLower = `${topic} ${sectionTitle}`.toLowerCase();

  const keywordImages: Record<string, string[]> = {
    'ai': [
      'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/8438918/pexels-photo-8438918.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    'business': [
      'https://images.pexels.com/photos/3184287/pexels-photo-3184287.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    'technology': [
      'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    'money': [
      'https://images.pexels.com/photos/164527/pexels-photo-164527.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3943716/pexels-photo-3943716.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    'education': [
      'https://images.pexels.com/photos/159844/books-student-study-education-159844.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    'health': [
      'https://images.pexels.com/photos/3768131/pexels-photo-3768131.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    'marketing': [
      'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3184639/pexels-photo-3184639.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    'automation': [
      'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/159299/graphic-design-studio-tracfone-programming-html-159299.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
  };

  for (const [keyword, images] of Object.entries(keywordImages)) {
    if (topicLower.includes(keyword)) {
      const hash = (topic + sectionTitle).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return images[hash % images.length];
    }
  }

  return getDefaultImageForSection('article', topic);
}

async function generateImageWithAI(providers: AIProvider[], sectionTitle: string, topic: string): Promise<string> {
  try {
    const imageProvider = providers.find(p => {
      const name = p.name.toLowerCase();
      return name.includes('openai') && p.api_key;
    });

    if (!imageProvider) {
      console.warn('No OpenAI provider available for AI image generation, using royalty-free stock images');
      return await fetchWebImage(sectionTitle, topic);
    }

    console.log('🎨 Generating AI image with DALL-E...');
    const prompt = `A professional, high-quality image for a newsletter section about: ${sectionTitle}. Topic: ${topic}. Style: clean, modern, professional, suitable for business newsletter.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${imageProvider.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('❌ DALL-E image generation failed:', errorData.error?.message || 'Unknown error');
      console.log('Falling back to royalty-free stock images');
      return await fetchWebImage(sectionTitle, topic);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0 && data.data[0].url) {
      console.log('✅ Successfully generated AI image with DALL-E');
      return data.data[0].url;
    }

    console.warn('No image URL in DALL-E response, using royalty-free stock images');
    return await fetchWebImage(sectionTitle, topic);
  } catch (error) {
    console.error('Error generating AI image:', error);
    console.log('Falling back to royalty-free stock images');
    return await fetchWebImage(sectionTitle, topic);
  }
}

async function applyBrandIntegration(
  sections: NewsletterSection[],
  brandConfig: BrandConfig,
  topic: string
): Promise<NewsletterSection[]> {
  const footerText = brandConfig.footer_text || `© ${new Date().getFullYear()} ${topic}. All rights reserved.`;

  return sections.map(section => ({
    ...section,
    metadata: {
      ...section.metadata,
      brand_applied: true,
      brand_template: brandConfig.template,
      brand_colors: brandConfig.colors,
      footer_text: footerText,
    },
  }));
}

async function validateContent(sections: NewsletterSection[]): Promise<NewsletterSection[]> {
  return sections
    .map(section => {
      let content = section.content;

      content = content.replace(/^```html\s*/i, '').replace(/\s*```$/i, '');
      content = content.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      content = content.replace(/^html\s*/i, '');
      content = content.replace(/\bhtml\b/gi, '');
      content = content.replace(/\bDefault\b/g, '');

      const greetingPatterns = [
        /^<p>\s*(Hey there|Hello|Hi everyone|Hi there|Welcome|Greetings)[!,.\s]*/gi,
        /^<p>\s*(Let's dive in|Let's get started|Here we go|Today we're going to)[!,.\s]*/gi,
        /^(Hey there|Hello|Hi everyone|Hi there|Welcome|Greetings)[!,.\s]*/gi,
        /^(Let's dive in|Let's get started|Here we go|Today we're going to)[!,.\s]*/gi,
        /<p>\s*(Hey there|Hello|Hi everyone|Hi there|Welcome|Greetings)[!,.\s]*<\/p>/gi,
        /<p>\s*(Let's dive in|Let's get started|Here we go|Today we're going to)[!,.\s]*<\/p>/gi,
      ];

      for (const pattern of greetingPatterns) {
        content = content.replace(pattern, '');
      }

      content = content.replace(/<p>\s*<p>/g, '<p>');
      content = content.replace(/<\/p>\s*<\/p>/g, '</p>');
      content = content.replace(/<p>\s*<\/p>/g, '');

      content = content.replace(/(<\/p>)\s*(<p>)/g, '$1\n\n$2');

      content = content.replace(/(<p>[^<]{200,}?[.!?])\s+([A-Z][^<]+<\/p>)/g, '$1</p>\n\n<p>$2');

      const paragraphs = content.match(/<p>[\s\S]*?<\/p>/g) || [];
      paragraphs.forEach(para => {
        const textLength = para.replace(/<[^>]*>/g, '').trim().length;
        if (textLength > 800) {
          console.warn(`Warning: Long paragraph detected (${textLength} chars) in section "${section.title}"`);
        }
      });

      content = content.trim();

      if (content && !content.startsWith('<')) {
        content = `<p>${content}</p>`;
      }

      return {
        ...section,
        content: content,
      };
    })
    .filter(section => {
      if (section.content.length < 50) {
        console.warn(`Section "${section.title}" has insufficient content (${section.content.length} chars)`);
        return false;
      }

      if (!section.title.trim()) {
        console.warn('Section missing title');
        return false;
      }

      const textContent = section.content.replace(/<[^>]*>/g, '').trim();
      if (textContent.length < 30) {
        console.warn(`Section "${section.title}" has insufficient text content after HTML removal`);
        return false;
      }

      return true;
    });
}

async function callAIProvider(provider: AIProvider, prompt: string, settings: any = {}): Promise<string> {
  const defaultSettings = {
    temperature: 0.7,
    max_tokens: 1000,
    ...provider.settings,
    ...settings,
  };

  const providerName = provider.name.toLowerCase();

  if (providerName.includes('openai')) {
    return await callOpenAI(provider.api_key, prompt, defaultSettings);
  } else if (providerName.includes('gemini')) {
    return await callGemini(provider.api_key, prompt, defaultSettings);
  } else if (providerName.includes('deepseek')) {
    return await callDeepSeek(provider.api_key, prompt, defaultSettings);
  } else if (providerName.includes('grok')) {
    return await callGrok(provider.api_key, prompt, defaultSettings);
  } else if (providerName.includes('openrouter')) {
    return await callOpenRouter(provider.api_key, prompt, defaultSettings);
  } else {
    return await callOpenAI(provider.api_key, prompt, defaultSettings);
  }
}

async function callOpenAI(apiKey: string, prompt: string, settings: any): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OpenAI API key is empty or invalid');
  }

  const model = settings.model || 'gpt-3.5-turbo';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    console.error('OpenAI API detailed error:', {
      status: response.status,
      statusText: response.statusText,
      model: model,
      errorData: errorData,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
    });
    throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated.';
}

async function callGemini(apiKey: string, prompt: string, settings: any): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    console.error('❌ Gemini API key is empty or invalid');
    throw new Error('Gemini API key is empty or invalid');
  }

  const model = settings.model || 'gemini-2.0-flash-exp';
  console.log(`🔄 Gemini request: model=${model}, temperature=${settings.temperature}, max_tokens=${settings.max_tokens}`);

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
    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    console.error('Gemini API detailed error:', {
      status: response.status,
      statusText: response.statusText,
      model: model,
      errorData: errorData,
      promptLength: prompt.length,
      settings: settings,
    });
    throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  let content = data.candidates[0]?.content?.parts[0]?.text || 'No response generated.';
  
  if (content.startsWith('```json') && content.endsWith('```')) {
    content = content.substring(7, content.length - 3).trim();
  } else if (content.startsWith('```') && content.endsWith('```')) {
    content = content.substring(3, content.length - 3).trim();
  }

  console.log(`✅ Gemini response received, content length: ${content.length}`);
  return content;
}

async function callDeepSeek(apiKey: string, prompt: string, settings: any): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('DeepSeek API key is empty or invalid');
  }

  const model = settings.model || 'deepseek-chat';
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    console.error('DeepSeek API detailed error:', {
      status: response.status,
      statusText: response.statusText,
      model: model,
      errorData: errorData,
    });
    throw new Error(`DeepSeek API error: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated.';
}

async function callGrok(apiKey: string, prompt: string, settings: any): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Grok API key is empty or invalid');
  }

  const model = settings.model || 'grok-beta';
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    console.error('Grok API detailed error:', {
      status: response.status,
      statusText: response.statusText,
      model: model,
      errorData: errorData,
    });
    throw new Error(`Grok API error: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated.';
}

async function callOpenRouter(apiKey: string, prompt: string, settings: any): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OpenRouter API key is empty or invalid');
  }

  const model = settings.model || 'x-ai/grok-4-fast:free';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ai-newsletter.com',
      'X-Title': 'AI Newsletter Platform',
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: settings.temperature,
      max_tokens: settings.max_tokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
    console.error('OpenRouter API detailed error:', {
      status: response.status,
      statusText: response.statusText,
      model: model,
      errorData: errorData,
    });
    throw new Error(`OpenRouter API error: ${response.status} - ${errorMessage}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated.';
}
