import { supabase } from '../lib/supabase';
import { EncryptionService } from '../utils/encryption';
import toast from 'react-hot-toast';

export interface BrevoConfig {
  id?: string;
  organization_id: string;
  api_key_encrypted: string;
  is_active: boolean;
  last_tested_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BrevoContact {
  id: number;
  email: string;
  attributes?: Record<string, any>;
  emailBlacklisted: boolean;
  smsBlacklisted: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface BrevoCampaign {
  id: number;
  name: string;
  subject: string;
  type: string;
  status: string;
  scheduledAt?: string;
  abTesting?: boolean;
  subjectA?: string;
  subjectB?: string;
  splitRule?: number;
  winnerCriteria?: string;
  winnerDelay?: number;
  sendAtBestTime?: boolean;
}

class BrevoService {
  private readonly BASE_URL = 'https://api.brevo.com/v3';

  async getConfig(organizationId: string): Promise<BrevoConfig | null> {
    try {
      const { data, error } = await supabase
        .from('brevo_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching Brevo config:', error);
      return null;
    }
  }

  async saveCredentials(
    organizationId: string,
    apiKey: string
  ): Promise<BrevoConfig> {
    try {
      console.log('💾 Brevo: Saving credentials for organization:', organizationId);

      const { data, error } = await supabase
        .from('brevo_configs')
        .upsert({
          organization_id: organizationId,
          api_key_encrypted: EncryptionService.encrypt(apiKey),
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

      console.log('✅ Brevo: Credentials saved successfully for organization:', organizationId);
      return data;
    } catch (error) {
      console.error('❌ Brevo: Credentials save error - Full details:', {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      throw error;
    }
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Brevo: Testing connection with API key...');

      const response = await fetch(`${this.BASE_URL}/account`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
        },
      });

      console.log('🧪 Brevo: Test response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Brevo: Test successful, account info:', data);
        return {
          success: true,
          message: `Connected successfully! Account: ${data.email || data.companyName || 'Verified'}`,
        };
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: 'Unknown error', code: 'UNKNOWN' };
        }

        console.error('❌ Brevo: Test connection failed. Response details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        return {
          success: false,
          message: errorData.message || `API Error (${response.status}): Please check your API key.`,
        };
      }
    } catch (error) {
      console.error('❌ Brevo: Network/connection error:', error);
      return {
        success: false,
        message: 'Network error: Unable to connect to Brevo. Please check your internet connection and try again.',
      };
    }
  }

  async getContacts(organizationId: string, limit: number = 100): Promise<BrevoContact[]> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        console.error('❌ Brevo: No configuration found for organization:', organizationId);
        throw new Error('Brevo not configured for this organization');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);

      if (!apiKey) {
        console.error('❌ Brevo: Failed to decrypt API key');
        throw new Error('Invalid API key stored. Please reconfigure Brevo.');
      }

      console.log('📡 Brevo: Fetching contacts...');
      const response = await fetch(`${this.BASE_URL}/contacts?limit=${limit}&sort=desc`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
        },
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: 'Unknown error', code: 'UNKNOWN' };
        }

        console.error('❌ Brevo: Failed to fetch contacts. Response details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        throw new Error(errorData.message || `Brevo API Error (${response.status}): Failed to fetch contacts`);
      }

      const data = await response.json();
      const contacts = data.contacts || [];

      console.log('✅ Brevo: Successfully fetched contacts:', contacts.length);
      return contacts;
    } catch (error) {
      console.error('❌ Brevo: Error in getContacts:', error);
      throw error;
    }
  }

  async getLists(organizationId: string): Promise<any[]> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        throw new Error('Brevo not configured');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);

      const response = await fetch(`${this.BASE_URL}/contacts/lists?limit=50&sort=desc`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch lists');
      }

      const data = await response.json();
      return data.lists || [];
    } catch (error) {
      console.error('Error fetching Brevo lists:', error);
      return [];
    }
  }

  async sendNewsletter(
    organizationId: string,
    newsletterContent: string,
    subject: string,
    listIds?: number[]
  ): Promise<{ success: boolean; message: string; campaignId?: number }> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        throw new Error('Brevo not configured');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);

      console.log('📧 Brevo: Creating and sending email campaign...');

      const campaignData: any = {
        name: `Newsletter - ${new Date().toISOString()}`,
        subject: subject,
        sender: {
          name: 'Newsletter',
          email: 'noreply@yourdomain.com',
        },
        type: 'classic',
        htmlContent: newsletterContent,
        recipients: listIds && listIds.length > 0
          ? { listIds: listIds }
          : { listIds: [] },
        inlineImageActivation: false,
        mirrorActive: false,
        recurring: false,
        footer: '[unsubscribe]',
        header: '',
        utmCampaign: 'newsletter',
        params: {},
        sendAtBestTime: false,
        abTesting: false,
        ipWarmupEnable: false,
        initialQuota: null,
        blockNewDomain: false,
      };

      const response = await fetch(`${this.BASE_URL}/emailCampaigns`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('❌ Brevo: Failed to parse error response:', parseError);
          throw new Error(`Brevo API Error (${response.status}): Unable to parse error response`);
        }

        console.error('❌ Brevo: Detailed API error response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorData: errorData,
        });

        throw new Error(errorData.message || `Brevo API Error (${response.status}): Failed to create campaign`);
      }

      const data = await response.json();
      const campaignId = data.id;

      console.log('📧 Brevo: Campaign created, now sending...', { campaignId });

      const sendResponse = await fetch(`${this.BASE_URL}/emailCampaigns/${campaignId}/sendNow`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
        },
      });

      if (!sendResponse.ok) {
        let errorData;
        try {
          errorData = await sendResponse.json();
        } catch {
          errorData = { message: 'Unknown error' };
        }
        throw new Error(errorData.message || 'Failed to send campaign');
      }

      console.log('✅ Brevo: Campaign sent successfully!', { campaignId });

      return {
        success: true,
        message: `Newsletter sent successfully! Campaign ID: ${campaignId}`,
        campaignId,
      };
    } catch (error) {
      console.error('❌ Brevo: Error sending newsletter:', error);
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
        throw new Error('Brevo not configured');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);

      console.log('📧 Brevo: Sending test email...');

      const testContentWithBanner = `
        <div style="background: #dbeafe; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">🧪 Test Email</h3>
          <p style="margin: 0; color: #1e3a8a; font-size: 14px;">This is a test email. The actual newsletter will be sent to your contacts without this notice.</p>
        </div>
        ${newsletterContent}
      `;

      const response = await fetch(`${this.BASE_URL}/smtp/email`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: 'Newsletter Test',
            email: 'noreply@yourdomain.com',
          },
          to: [{ email: testEmail }],
          subject: `[TEST] ${subject}`,
          htmlContent: testContentWithBanner,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('❌ Brevo: Failed to parse test email error response:', parseError);
          throw new Error(`Brevo API Error (${response.status}): Unable to parse error response`);
        }

        console.error('❌ Brevo: Detailed test email API error response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorData: errorData,
        });

        throw new Error(errorData.message || `Brevo API Error (${response.status}): Failed to send test email`);
      }

      console.log('✅ Brevo: Test email sent successfully');

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

  async getCampaigns(organizationId: string, limit: number = 50): Promise<BrevoCampaign[]> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config) {
        throw new Error('Brevo not configured');
      }

      const apiKey = EncryptionService.decrypt(config.api_key_encrypted);

      const response = await fetch(`${this.BASE_URL}/emailCampaigns?limit=${limit}&sort=desc`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch campaigns');
      }

      const data = await response.json();
      return data.campaigns || [];
    } catch (error) {
      console.error('Error fetching Brevo campaigns:', error);
      return [];
    }
  }
}

export const brevoService = new BrevoService();
