export interface PresetOption {
  id: string;
  label: string;
  description: string;
  promptModifier: string;
}

export interface PresetCategory {
  id: string;
  label: string;
  description: string;
  options: PresetOption[];
}

export const TONE_PRESETS: PresetOption[] = [
  {
    id: 'professional',
    label: 'Professional',
    description: 'Formal, authoritative, and polished tone suitable for business communications',
    promptModifier: 'Use a professional, authoritative tone. Maintain formal language, clear structure, and business-appropriate vocabulary. Be confident and credible.'
  },
  {
    id: 'conversational',
    label: 'Conversational',
    description: 'Friendly, approachable, and engaging like talking to a colleague',
    promptModifier: 'Use a conversational, friendly tone as if speaking directly to a trusted colleague. Be warm, approachable, and engaging while maintaining professionalism. Use natural language and relatable examples.'
  },
  {
    id: 'educational',
    label: 'Educational',
    description: 'Clear, informative, and patient like a teacher explaining concepts',
    promptModifier: 'Use an educational, instructive tone. Break down complex concepts clearly, provide helpful examples, and guide readers through information step-by-step. Be patient and thorough.'
  },
  {
    id: 'persuasive',
    label: 'Persuasive',
    description: 'Compelling, action-oriented, and motivating',
    promptModifier: 'Use a persuasive, compelling tone. Emphasize benefits, create urgency when appropriate, and motivate readers to take action. Be confident and results-focused.'
  },
  {
    id: 'inspirational',
    label: 'Inspirational',
    description: 'Uplifting, motivating, and empowering',
    promptModifier: 'Use an inspirational, uplifting tone. Empower readers, highlight possibilities, and create enthusiasm. Be positive, energizing, and vision-focused.'
  }
];

export const STYLE_PRESETS: PresetOption[] = [
  {
    id: 'concise',
    label: 'Concise',
    description: 'Brief and to-the-point, perfect for busy readers',
    promptModifier: 'Write in a concise, efficient style. Use short paragraphs (2-4 sentences), bullet points where appropriate, and get to the point quickly. Eliminate unnecessary words. Each section should be focused and scannable.'
  },
  {
    id: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive and thorough with rich explanations',
    promptModifier: 'Write in a detailed, comprehensive style. Provide thorough explanations, relevant context, supporting examples, and deeper analysis. Use longer paragraphs (4-6 sentences) to fully explore topics.'
  },
  {
    id: 'story_driven',
    label: 'Story-driven',
    description: 'Narrative-focused with examples and case studies',
    promptModifier: 'Write in a story-driven, narrative style. Use anecdotes, case studies, real-world examples, and storytelling techniques to illustrate points. Create a narrative arc that engages readers emotionally.'
  },
  {
    id: 'data_driven',
    label: 'Data-driven',
    description: 'Fact-based with statistics, research, and evidence',
    promptModifier: 'Write in a data-driven, analytical style. Emphasize facts, statistics, research findings, and evidence-based insights. Use numbers, percentages, and concrete data points to support claims.'
  },
  {
    id: 'action_oriented',
    label: 'Action-oriented',
    description: 'Practical and focused on implementation and next steps',
    promptModifier: 'Write in an action-oriented, practical style. Focus on actionable takeaways, implementation steps, and concrete next actions. Include "how-to" elements and clear calls-to-action throughout.'
  }
];

export const AUDIENCE_PRESETS: PresetOption[] = [
  {
    id: 'beginners',
    label: 'Beginners',
    description: 'New to the topic, needs foundational explanations',
    promptModifier: 'Write for beginners who are new to this topic. Avoid jargon or explain it when necessary. Provide foundational context, define key terms, and don\'t assume prior knowledge. Use clear, simple language.'
  },
  {
    id: 'professionals',
    label: 'Professionals',
    description: 'Working professionals with moderate expertise',
    promptModifier: 'Write for working professionals with moderate expertise. Assume basic familiarity with the field but explain advanced concepts. Balance accessibility with depth. Focus on practical applications relevant to their work.'
  },
  {
    id: 'executives',
    label: 'Executives',
    description: 'Senior decision-makers focused on strategic insights',
    promptModifier: 'Write for executives and senior decision-makers. Focus on strategic implications, business impact, and high-level insights. Be concise and emphasize ROI, competitive advantages, and organizational outcomes.'
  },
  {
    id: 'general',
    label: 'General Public',
    description: 'Broad audience with varied backgrounds',
    promptModifier: 'Write for a general audience with varied backgrounds. Use accessible language, explain specialized terms, and provide context. Make content engaging and relevant to everyday life or common interests.'
  },
  {
    id: 'technical',
    label: 'Technical Experts',
    description: 'Deep technical knowledge, wants specific details',
    promptModifier: 'Write for technical experts with deep domain knowledge. Use industry-specific terminology, dive into technical details, discuss nuances, and provide advanced insights. Assume high level of expertise.'
  }
];

export const CONTEXT_PRESETS: PresetOption[] = [
  {
    id: 'industry_news',
    label: 'Industry News',
    description: 'Latest developments and current events',
    promptModifier: 'Frame content as industry news and current developments. Focus on what\'s new, what\'s changing, and why it matters now. Include timely insights and immediate relevance.'
  },
  {
    id: 'how_to',
    label: 'How-to Guide',
    description: 'Step-by-step instructions and tutorials',
    promptModifier: 'Structure content as a how-to guide or tutorial. Provide clear step-by-step instructions, actionable advice, and practical implementation guidance. Focus on teaching readers how to do something specific.'
  },
  {
    id: 'trend_analysis',
    label: 'Trend Analysis',
    description: 'Analysis of patterns and future implications',
    promptModifier: 'Present content as trend analysis. Identify patterns, analyze implications, discuss future directions, and provide forward-looking insights. Help readers understand where things are heading.'
  },
  {
    id: 'product_updates',
    label: 'Product Updates',
    description: 'Features, improvements, and announcements',
    promptModifier: 'Frame content as product updates and announcements. Highlight new features, improvements, benefits, and practical use cases. Focus on what\'s new and how it helps users.'
  },
  {
    id: 'educational_series',
    label: 'Educational Series',
    description: 'Part of ongoing learning journey',
    promptModifier: 'Present content as part of an educational series. Build on foundational concepts, create learning progression, and help readers develop deeper understanding over time. Reference how this fits into broader learning.'
  }
];

export const GUIDE_PRESETS: PresetOption[] = [
  {
    id: 'standard',
    label: 'Standard Structure',
    description: 'Balanced sections with clear hierarchy',
    promptModifier: 'Use standard newsletter structure with clear sections, balanced content distribution, and logical flow from introduction through main points to conclusion.'
  },
  {
    id: 'highlight_focused',
    label: 'Highlight-focused',
    description: 'Lead with key takeaways and highlights',
    promptModifier: 'Lead with key highlights and main takeaways upfront. Put the most important information first, then provide supporting details and context.'
  },
  {
    id: 'deep_dive',
    label: 'Deep Dive',
    description: 'Thorough exploration of single major topic',
    promptModifier: 'Structure as a deep dive into a single major topic. Provide comprehensive coverage, multiple angles, and thorough exploration rather than covering multiple separate topics.'
  },
  {
    id: 'curated_list',
    label: 'Curated List',
    description: 'Collection of items with brief explanations',
    promptModifier: 'Structure as a curated list or roundup. Present multiple distinct items, resources, or insights with concise explanations for each. Make it scannable and easy to navigate.'
  },
  {
    id: 'problem_solution',
    label: 'Problem-Solution',
    description: 'Identify challenges and provide solutions',
    promptModifier: 'Structure using problem-solution framework. Clearly identify challenges or pain points, then provide practical solutions, approaches, or strategies to address them.'
  }
];

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'tone',
    label: 'Tone',
    description: 'How the newsletter sounds and feels',
    options: TONE_PRESETS
  },
  {
    id: 'style',
    label: 'Writing Style',
    description: 'Content structure and depth',
    options: STYLE_PRESETS
  },
  {
    id: 'audience',
    label: 'Target Audience',
    description: 'Who you\'re writing for',
    options: AUDIENCE_PRESETS
  },
  {
    id: 'context',
    label: 'Content Context',
    description: 'Purpose and framing',
    options: CONTEXT_PRESETS
  },
  {
    id: 'guide',
    label: 'Structure Guide',
    description: 'Content organization approach',
    options: GUIDE_PRESETS
  }
];

export function buildPromptModifiers(presets: {
  tone?: string;
  style?: string;
  audience?: string;
  context?: string;
  guide?: string;
}): string {
  const modifiers: string[] = [];

  if (presets.tone) {
    const preset = TONE_PRESETS.find(p => p.id === presets.tone);
    if (preset) modifiers.push(`TONE: ${preset.promptModifier}`);
  }

  if (presets.style) {
    const preset = STYLE_PRESETS.find(p => p.id === presets.style);
    if (preset) modifiers.push(`STYLE: ${preset.promptModifier}`);
  }

  if (presets.audience) {
    const preset = AUDIENCE_PRESETS.find(p => p.id === presets.audience);
    if (preset) modifiers.push(`AUDIENCE: ${preset.promptModifier}`);
  }

  if (presets.context) {
    const preset = CONTEXT_PRESETS.find(p => p.id === presets.context);
    if (preset) modifiers.push(`CONTEXT: ${preset.promptModifier}`);
  }

  if (presets.guide) {
    const preset = GUIDE_PRESETS.find(p => p.id === presets.guide);
    if (preset) modifiers.push(`STRUCTURE: ${preset.promptModifier}`);
  }

  return modifiers.length > 0 ? `\n\nCUSTOMIZATION REQUIREMENTS:\n${modifiers.join('\n\n')}` : '';
}
