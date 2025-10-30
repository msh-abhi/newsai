import { z } from 'zod';

export const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(50).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

export const aiProviderSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  type: z.enum(['research', 'generation']),
  api_key: z.string().min(1, 'API key is required'),
  settings: z.record(z.any()).optional(),
});

export const knowledgeItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['company_info', 'expertise', 'work', 'website', 'social', 'custom']),
  metadata: z.record(z.any()).optional(),
});

export const brandConfigSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
    secondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
    accent: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  }),
  logo_url: z.string().url().optional().or(z.literal('')),
  font_family: z.string().min(1, 'Font family is required'),
  template: z.enum(['modern', 'classic', 'minimal', 'creative']),
});

export const generationRequestSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  mode: z.enum(['quick', 'detailed', 'custom']),
  instructions: z.string().optional(),
  include_events: z.boolean(),
  include_knowledge: z.boolean(),
});