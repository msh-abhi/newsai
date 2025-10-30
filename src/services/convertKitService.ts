import { supabase } from '../lib/supabase';
import { EncryptionService } from '../utils/encryption';
import toast from 'react-hot-toast';

export interface ConvertKitConfig {
  id?: string;
  organization_id: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
  is_active: boolean;
  last_tested_at?: string;
  created_at?: string;
  updated_at?: string;
}

class ConvertKitService {
  async getConfig(organizationId: string): Promise<ConvertKitConfig | null> {
    try {
      const { data, error } = await supabase
        .from('convertkit_configs')
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
      console.error('Error fetching ConvertKit config:', error);
      return null;
    }
  }

  async saveCredentials(
    organizationId: string,
    apiKey: string,
    apiSecret: string
  ): Promise<ConvertKitConfig> {
    try {
      console.log('💾 ConvertKit: Saving credentials for organization:', organizationId);
      
      const { data, error } = await supabase
        .from('convertkit_configs')
        .upsert({
          organization_id: organizationId,
          api_key_encrypted: EncryptionService.encrypt(apiKey),
          api_secret_encrypted: EncryptionService.encrypt(apiSecret),
          is_active: true,
          last_tested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'organization_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ ConvertKit: Credentials saved successfully for organization:', organizationId);
      return data;
    } catch (error) {
      console.error('❌ ConvertKit: Credentials save error - Full details:', {
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

  async testConnection(apiKey: string, apiSecret: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 ConvertKit: Testing connection with credentials...');
      
      // Test with forms endpoint which requires both API key and secret
      const response = await fetch(`https://api.convertkit.com/v3/forms?api_key=${apiKey}&api_secret=${apiSecret}`);
      
      console.log('🧪 ConvertKit: Test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ ConvertKit: Test successful, forms found:', data.forms?.length || 0);
        return {
          success: true,
          message: `Connected successfully! Found ${data.forms?.length || 0} forms in your account.`,
        };
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Unknown error', message: 'Unable to parse error response' };
        }
        
        console.error('❌ ConvertKit: Test connection failed. Response details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        
        return {
          success: false,
          message: errorData.message || errorData.error || `API Error (${response.status}): Please check your credentials.`,
        };
      }
    } catch (error) {
      console.error('❌ ConvertKit: Network/connection error:', error);
      return {
        success: false,
        message: 'Network error: Unable to connect to ConvertKit. Please check your internet connection and try again.',
      };
    }
  }

  async getSubscribers(organizationId: string): Promise<any[]> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        console.error('❌ ConvertKit: No configuration found for organization:', organizationId);
        throw new Error('ConvertKit not configured for this organization');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);
      const apiSecret = EncryptionService.decrypt(config.api_secret_encrypted);
      
      if (!apiKey || !apiSecret) {
        console.error('❌ ConvertKit: Failed to decrypt API credentials');
        throw new Error('Invalid API credentials stored. Please reconfigure ConvertKit.');
      }
      
      console.log('📡 ConvertKit: Fetching subscribers...');
      const response = await fetch(`https://api.convertkit.com/v3/subscribers?api_key=${apiKey}&api_secret=${apiSecret}&sort_order=desc&per_page=100`);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Unknown error', message: 'Unable to parse error response' };
        }
        
        console.error('❌ ConvertKit: Failed to fetch subscribers. Response details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        
        throw new Error(errorData.message || errorData.error || `ConvertKit API Error (${response.status}): Failed to fetch subscribers`);
      }

      const data = await response.json();
      const subscribers = data.subscribers || [];
      
      console.log('✅ ConvertKit: Successfully fetched subscribers:', subscribers.length);
      return subscribers;
    } catch (error) {
      console.error('❌ ConvertKit: Error in getSubscribers:', error);
      throw error; // Re-throw to let the UI handle the error properly
    }
  }

  async getForms(organizationId: string): Promise<any[]> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        throw new Error('ConvertKit not configured');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);
      
      const response = await fetch(`https://api.convertkit.com/v3/forms?api_key=${apiKey}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch forms');
      }

      const data = await response.json();
      return data.forms || [];
    } catch (error) {
      console.error('Error fetching ConvertKit forms:', error);
      return [];
    }
  }

  async getTags(organizationId: string): Promise<any[]> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        throw new Error('ConvertKit not configured');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);
      
      const response = await fetch(`https://api.convertkit.com/v3/tags?api_key=${apiKey}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tags');
      }

      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Error fetching ConvertKit tags:', error);
      return [];
    }
  }

  async getSequences(organizationId: string): Promise<any[]> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        throw new Error('ConvertKit not configured');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);
      
      const response = await fetch(`https://api.convertkit.com/v3/sequences?api_key=${apiKey}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sequences');
      }

      const data = await response.json();
      return data.courses || [];
    } catch (error) {
      console.error('Error fetching ConvertKit sequences:', error);
      return [];
    }
  }

  async sendNewsletter(
    organizationId: string,
    newsletterContent: string,
    subject: string,
    segmentId?: string
  ): Promise<{ success: boolean; message: string; broadcastId?: string }> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        throw new Error('ConvertKit not configured');
      }

      const apiSecret = EncryptionService.decrypt(config.api_secret_encrypted);

      console.log('📧 ConvertKit: Creating and sending broadcast...');

      const response = await fetch('https://api.convertkit.com/v3/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_secret: apiSecret,
          subject,
          content: newsletterContent,
          description: 'Newsletter sent via AI Newsletter Platform',
          public: true,
          published: true,
          send_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('❌ ConvertKit: Failed to parse error response:', parseError);
          throw new Error(`ConvertKit API Error (${response.status}): Unable to parse error response`);
        }

        console.error('❌ ConvertKit: Detailed API error response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorData: errorData,
        });

        let errorMessage = 'Failed to create broadcast';

        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.message) return err.message;
            if (err.detail) return err.detail;
            return JSON.stringify(err);
          });
          errorMessage = `Validation errors: ${errorMessages.join(', ')}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }

        throw new Error(`ConvertKit API Error (${response.status}): ${errorMessage}`);
      }

      const data = await response.json();
      const broadcastId = data.broadcast?.id;

      console.log('✅ ConvertKit: Broadcast sent successfully!', { broadcastId });

      return {
        success: true,
        message: `Newsletter sent successfully! Broadcast ID: ${broadcastId}`,
        broadcastId,
      };
    } catch (error) {
      console.error('❌ ConvertKit: Error sending newsletter:', error);
      return {
        success: false,
        message: error.message || 'Failed to send newsletter',
      };
    }
  }

  async sendTestEmail(
    organizationId: string,
    newsletterContent: string,
    subject: string,
    testEmail: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        throw new Error('ConvertKit not configured');
      }

      const apiSecret = EncryptionService.decrypt(config.api_secret_encrypted);
      
      // Create a test broadcast that sends only to the specified email
      const response = await fetch('https://api.convertkit.com/v3/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_secret: apiSecret,
          subject: `[TEST] ${subject}`,
          content: `
            <div style="background: #f3f4f6; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">🧪 Test Email</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">This is a test email. The actual newsletter will be sent to your subscribers without this notice.</p>
            </div>
            ${newsletterContent}
          `,
          description: 'Test email sent via AI Newsletter Platform',
          public: false,
          email_address: testEmail, // Send only to test email
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('❌ ConvertKit: Failed to parse test email error response:', parseError);
          throw new Error(`ConvertKit API Error (${response.status}): Unable to parse error response`);
        }
        
        // Log the complete error response for debugging
        console.error('❌ ConvertKit: Detailed test email API error response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorData: errorData,
          requestBody: {
            subject: `[TEST] ${subject}`,
            hasContent: !!newsletterContent,
            contentLength: newsletterContent?.length || 0,
            testEmail: testEmail,
          },
        });
        
        // Extract detailed error information
        let errorMessage = 'Failed to send test email';
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          // ConvertKit often returns validation errors in an 'errors' array
          const errorMessages = errorData.errors.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.message) return err.message;
            if (err.detail) return err.detail;
            return JSON.stringify(err);
          });
          errorMessage = `Validation errors: ${errorMessages.join(', ')}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        
        throw new Error(`ConvertKit API Error (${response.status}): ${errorMessage}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        message: `Test email sent successfully to ${testEmail}!`,
      };
    } catch (error) {
      console.error('Error sending test email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send test email',
      };
    }
  }
}

export const convertKitService = new ConvertKitService();