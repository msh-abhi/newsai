export const APP_CONFIG = {
  name: 'AI Newsletter',
  description: 'AI-powered newsletter generation platform',
  version: '1.0.0',
  supportEmail: 'support@ainewsletter.com',
};

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: ['10 newsletters/month', '3 team members', 'Basic analytics'],
    limits: {
      newsletters_per_month: 10,
      team_members: 3,
      api_calls: 1000,
    },
  },
  pro: {
    name: 'Pro',
    price: 29,
    features: ['Unlimited newsletters', '10 team members', 'Advanced analytics', 'API access'],
    limits: {
      newsletters_per_month: -1,
      team_members: 10,
      api_calls: 10000,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    features: ['Everything in Pro', 'Unlimited team members', 'White-label', 'Priority support'],
    limits: {
      newsletters_per_month: -1,
      team_members: -1,
      api_calls: 100000,
    },
  },
};

export const AI_PROVIDERS = {
  research: [
    {
      id: 'perplexity',
      name: 'Perplexity AI',
      description: 'Advanced web research with real-time data',
      website: 'https://perplexity.ai',
    },
    {
      id: 'tavily',
      name: 'Tavily API',
      description: 'Comprehensive search and analysis',
      website: 'https://tavily.com',
    },
    {
      id: 'serpapi',
      name: 'SerpAPI',
      description: 'Google search results and insights',
      website: 'https://serpapi.com',
    },
  ],
  generation: [
    {
      id: 'openai',
      name: 'OpenAI GPT-4',
      description: 'Fast and reliable language model for content creation',
      website: 'https://openai.com',
    },
    {
      id: 'gemini',
      name: 'Google Gemini 1.5 Flash',
      description: 'Fast and efficient content generation with latest capabilities',
      website: 'https://ai.google.dev',
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      description: 'Cost-effective alternative for high-volume generation',
      website: 'https://deepseek.com',
    },
    {
      id: 'grok',
      name: 'Grok',
      description: 'X.AI\'s conversational AI with real-time knowledge',
      website: 'https://x.ai',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      description: 'Access to multiple AI models including free options',
      website: 'https://openrouter.ai',
    },
  ],
};

export const KNOWLEDGE_TYPES = [
  { id: 'company_info', name: 'Company Info', description: 'About your organization' },
  { id: 'expertise', name: 'Expertise', description: 'Your areas of specialization' },
  { id: 'work', name: 'Recent Work', description: 'Projects and case studies' },
  { id: 'website', name: 'Website', description: 'Web content and pages' },
  { id: 'social', name: 'Social Media', description: 'Social media profiles' },
  { id: 'custom', name: 'Custom', description: 'Other relevant content' },
];