import { supabase } from '../lib/supabase';

export interface Newsletter {
  id: string;
  organization_id: string;
  title: string;
  content: any;
  html_content: string;
  status: 'draft' | 'generating' | 'ready' | 'sent';
  generation_progress: number;
  generation_logs: string[];
  scheduled_at?: string;
  sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

class NewsletterService {
  async getNewsletters(organizationId: string): Promise<Newsletter[]> {
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getNewsletter(id: string): Promise<Newsletter | null> {
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createNewsletter(newsletter: Omit<Newsletter, 'id' | 'created_at' | 'updated_at'>): Promise<Newsletter> {
    try {
      const { data, error } = await supabase
        .from('newsletters')
        .insert(newsletter)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Newsletter creation error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      throw error;
    }
  }

  async updateNewsletter(id: string, updates: Partial<Newsletter>): Promise<Newsletter> {
    try {
      const { data, error } = await supabase
        .from('newsletters')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Newsletter update error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      throw error;
    }
  }

  async deleteNewsletter(id: string): Promise<void> {
    const { error } = await supabase
      .from('newsletters')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateGenerationProgress(
    id: string, 
    progress: number, 
    phase: string,
    logs: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from('newsletters')
      .update({
        generation_progress: progress,
        generation_logs: logs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }
}

export const newsletterService = new NewsletterService();