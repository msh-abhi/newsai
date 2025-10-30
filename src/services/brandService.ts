import { supabase } from '../lib/supabase';

export interface BrandConfig {
  id?: string;
  organization_id: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo_url?: string;
  font_family: string;
  template: 'modern' | 'classic' | 'minimal' | 'creative';
  footer_text?: string;
  created_at?: string;
  updated_at?: string;
}

class BrandService {
  async getBrandConfig(organizationId: string): Promise<BrandConfig | null> {
    try {
      const { data, error } = await supabase
        .from('brand_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching brand config:', error);
      return null;
    }
  }

  async saveBrandConfig(config: BrandConfig): Promise<BrandConfig> {
    try {
      console.log('💾 brandService: Saving brand config:', {
        organization_id: config.organization_id,
        template: config.template,
        font_family: config.font_family,
        hasLogo: !!config.logo_url,
      });

      const { data, error } = await supabase
        .from('brand_configs')
        .upsert({
          organization_id: config.organization_id,
          colors: config.colors,
          logo_url: config.logo_url || '',
          font_family: config.font_family,
          template: config.template,
          footer_text: config.footer_text || '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' }) // FIX: onConflict is an option for upsert
        .select()
        .single();

      if (error) {
        console.error('❌ brandService: Database error saving config:', error);
        throw error;
      }
      
      console.log('✅ brandService: Brand config saved successfully:', data.id);
      return data;
    } catch (error) {
      console.error('Brand config save error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      throw new Error(error?.message || 'Failed to save brand configuration');
    }
  }
}

export const brandService = new BrandService();