import { supabase } from '../lib/supabase';

export interface KnowledgeItem {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  type: 'company_info' | 'expertise' | 'work' | 'website' | 'social' | 'custom';
  embedding?: number[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

class KnowledgeService {
  async getItems(organizationId: string, type?: string): Promise<KnowledgeItem[]> {
    console.log('🔍 knowledgeService: Fetching knowledge items for organization:', organizationId, 'type:', type);
    
    let query = supabase
      .from('knowledge_items')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    const items = data || [];
    console.log('✅ knowledgeService: Fetched knowledge items:', items.length, 'items');
    console.log('📋 knowledgeService: Items data:', items);
    
    return items;
  }

  async createItem(item: Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>): Promise<KnowledgeItem> {
    try {
      console.log('💾 knowledgeService: Creating knowledge item:', {
        title: item.title,
        type: item.type,
        organization_id: item.organization_id,
        contentLength: item.content.length,
      });

      const { data, error } = await supabase
        .from('knowledge_items')
        .insert(item)
        .select()
        .single();

      if (error) {
        console.error('❌ knowledgeService: Database error creating item:', error);
        throw error;
      }
      
      console.log('✅ knowledgeService: Knowledge item created successfully:', data.id);
      console.log('📋 knowledgeService: Created item data:', data);
      return data;
    } catch (error) {
      console.error('Knowledge item creation error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      throw new Error(error?.message || 'Failed to create knowledge item');
    }
  }

  async updateItem(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
    try {
      const { data, error } = await supabase
        .from('knowledge_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Knowledge item update error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      throw new Error(error?.message || 'Failed to update knowledge item');
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('knowledge_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Knowledge item deletion error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      throw new Error(error?.message || 'Failed to delete knowledge item');
    }
  }

  async searchItems(organizationId: string, query: string): Promise<KnowledgeItem[]> {
    try {
      // Try vector search first if available
      console.log('🔍 knowledgeService: Attempting vector search for query:', query.substring(0, 50) + '...');
      const { data: vectorResults, error: vectorError } = await supabase.functions.invoke('vector-search', {
        body: {
          query,
          organization_id: organizationId,
          limit: 10,
        },
      });

      if (!vectorError && vectorResults?.results) {
        console.log('✅ knowledgeService: Vector search successful, results:', vectorResults.results.length);
        return vectorResults.results;
      } else if (vectorError) {
        console.error('❌ knowledgeService: Vector search failed:', vectorError);
      }

      // Fallback to text search
      console.log('🔄 knowledgeService: Falling back to text search...');
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error('❌ knowledgeService: Text search failed:', error);
        throw error;
      }
      
      console.log('✅ knowledgeService: Text search completed, results:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ knowledgeService: Search failed completely:', error);
      return [];
    }
  }

  async importFromUrl(url: string): Promise<{ title: string; content: string }> {
    try {
      // Call web scraping edge function
      const { data, error } = await supabase.functions.invoke('web-scraper', {
        body: { url },
      });

      if (error) throw error;

      return {
        title: data.title || 'Imported Content',
        content: data.content || 'Content could not be extracted from the provided URL.',
      };
    } catch (error) {
      console.error('Error importing from URL:', error);
      throw new Error(error?.message || 'Failed to import content from URL. Please check the URL and try again.');
    }
  }
}

export const knowledgeService = new KnowledgeService();