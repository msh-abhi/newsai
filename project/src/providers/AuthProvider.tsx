import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isConnected } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Organization, OrganizationMember } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSupabaseConnected: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    loading,
    setUser,
    setLoading,
    setOrganizations,
    setCurrentOrganization,
    setMembership,
    setIsOrgResolved,
    clearAuth,
  } = useAuthStore();

  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      const connected = isConnected;
      setIsSupabaseConnected(connected);
      console.log('🔌 AuthProvider: Supabase connection status:', connected);
    };
    checkConnection();

    setLoading(true);
    setIsOrgResolved(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        // When the user signs out, clear all auth-related state.
        if (event === 'SIGNED_OUT') {
          console.log('🚪 AuthProvider: User signed out, clearing auth state');
          clearAuth();
          setLoading(false);
          setIsOrgResolved(true);
          return;
        }

        // For any other auth event, update the user and their organization.
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          // Fetching organizations is critical for the app to function.
          await fetchAndSetOrganizations(currentUser.id);
        }
        
        // Once user and org are resolved, mark loading as complete.
        setLoading(false);
        setIsOrgResolved(true);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [clearAuth, setCurrentOrganization, setMembership, setOrganizations, setUser, setLoading, setIsOrgResolved]);

  const fetchAndSetOrganizations = async (userId: string) => {
    try {
      console.log('🔄 AuthProvider: Fetching organizations for user:', userId);

      const { data, error } = await supabase
        .from('organization_members')
        .select(`*, organization:organizations(*)`)
        .eq('user_id', userId);

      if (error) {
        if (error.code === 'PGRST116' || (data && data.length === 0)) {
          console.log('📝 AuthProvider: No organizations found for user');
          setOrganizations([]);
          setCurrentOrganization(null);
          setMembership(null);
        } else {
          throw error;
        }
      } else {
        const organizations = data.map(member => member.organization).filter(Boolean) as Organization[] || [];
        const firstOrg = organizations[0];
        const firstMembership = data?.[0];

        console.log('✅ AuthProvider: Found organizations:', organizations.length);
        console.log('🏢 AuthProvider: Setting current organization:', firstOrg?.name);
        
        setOrganizations(organizations);
        setCurrentOrganization(firstOrg || null);
        setMembership(firstMembership || null);
      }
    } catch (error) {
      console.error('❌ AuthProvider: Error fetching organizations:', error);
      setOrganizations([]);
      setCurrentOrganization(null);
      setMembership(null);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isSupabaseConnected,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};