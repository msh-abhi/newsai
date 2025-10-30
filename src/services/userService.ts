import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUpdate {
  name?: string;
  settings?: Record<string, any>;
}

class UserService {
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // Update user metadata in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          timezone: updates.timezone,
        },
      });

      if (error) throw error;

      return {
        id: data.user.id,
        email: data.user.email || '',
        full_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
        timezone: data.user.user_metadata?.timezone,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error('User profile update error - Full details:', {
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

  async updateOrganization(organizationId: string, updates: OrganizationUpdate): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (error) throw error;
    } catch (error) {
      console.error('Organization update error - Full details:', {
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

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Password change error - Full details:', {
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

  async deleteAccount(): Promise<void> {
    try {
      // This would require admin privileges in production
      // For now, just sign out the user
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Account deletion error - Full details:', {
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
}

export const userService = new UserService();