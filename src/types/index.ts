export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: OrganizationSettings;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  max_newsletters_per_month: number;
  max_team_members: number;
  custom_branding: boolean;
  api_access: boolean;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  joined_at: string;
  user?: User;
}

export interface AIProvider {
  id: string;
  name: string;
  type: 'research' | 'generation';
  api_key: string;
  settings: Record<string, any>;
  is_active: boolean;
  organization_id: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'company_info' | 'expertise' | 'work' | 'website' | 'social' | 'custom';
  embedding?: number[];
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface EventSource {
  id: string;
  name: string;
  url: string;
  keywords: string[];
  location: {
    city: string;
    state: string;
    radius: number;
  };
  is_active: boolean;
  organization_id: string;
}

export interface BrandConfig {
  id: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo_url?: string;
  font_family: string;
  template: 'modern' | 'classic' | 'minimal' | 'creative';
  footer_text?: string;
  organization_id: string;
}

export interface Newsletter {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'generating' | 'ready' | 'sent';
  generation_progress?: number;
  generation_logs?: string[];
  scheduled_at?: string;
  sent_at?: string;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GenerationRequest {
  topic: string;
  mode: 'quick' | 'detailed' | 'custom';
  instructions?: string;
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

export interface AnalyticsData {
  newsletters_sent: number;
  total_opens: number;
  total_clicks: number;
  open_rate: number;
  click_rate: number;
  cost_this_month: number;
  ai_calls_this_month: number;
}