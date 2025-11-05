import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
  const isFetchingRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const withTimeout = (promise: Promise<any>, ms: number) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
    ]);

  const fetchAndSetOrganizations = async (userId: string, isRetry = false) => {
    if (isFetchingRef.current && !isRetry) {
      console.log('🔄 AuthProvider: Organization fetch already in progress, skipping');
      return;
    }

    isFetchingRef.current = true;
    
    try {
      console.log(`🔄 AuthProvider: Fetching organizations for user: ${userId} (Attempt ${retryCountRef.current + 1})`);

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
        const organizations = data.map((member: any) => member.organization).filter(Boolean) as Organization[] || [];
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
      
      // Retry logic with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000); // Max 5 seconds
        
        console.log(`🔄 AuthProvider: Retrying in ${delay}ms... (Attempt ${retryCountRef.current + 1}/${maxRetries + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchAndSetOrganizations(userId, true);
      }
      
      // If all retries fail, set empty state
      setOrganizations([]);
      setCurrentOrganization(null);
      setMembership(null);
      throw error;
    } finally {
      isFetchingRef.current = false;
      retryCountRef.current = 0;
    }
  };

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
      async (event: string, session: Session | null) => {
        console.log('Auth state changed:', event, session?.user?.email);

        // When the user signs out, clear all auth-related state.
        if (event === 'SIGNED_OUT') {
          console.log('🚪 AuthProvider: User signed out, clearing auth state');
          clearAuth();
          setLoading(false);
          setIsOrgResolved(true);
          return;
        }

        // For token refresh events, only update user but don't refetch organizations
        // to avoid unnecessary timeouts and state resets
        if (event === 'TOKEN_REFRESHED') {
          const currentUser = session?.user || null;
          setUser(currentUser);
          console.log('🔄 AuthProvider: Token refreshed, user updated');
          return;
        }

        // For initial sign in or session restoration
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          // Reset retry counter on new user session
          retryCountRef.current = 0;
          
          // Fetching organizations is critical for the app to function.
          try {
            await withTimeout(fetchAndSetOrganizations(currentUser.id), 10000); // 10 seconds timeout
          } catch (error) {
            console.error('❌ AuthProvider: Error or timeout fetching organizations:', error);
            // Set empty organizations and continue, as this might be expected for new users
            setOrganizations([]);
            setCurrentOrganization(null);
            setMembership(null);
            setIsOrgResolved(true);
            setLoading(false);
            return; // Prevent setting loading false twice
          }
        }

        // Once user and org are resolved, mark loading as complete.
        setLoading(false);
        setIsOrgResolved(true);
      }
    );

    // Initial session check
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('❌ AuthProvider: Error getting session:', error);
          setLoading(false);
          setIsOrgResolved(true);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          try {
            await withTimeout(fetchAndSetOrganizations(session.user.id), 10000);
          } catch (error) {
            console.error('❌ AuthProvider: Error fetching initial organizations:', error);
            setOrganizations([]);
            setCurrentOrganization(null);
            setMembership(null);
          }
        }
        
        setLoading(false);
        setIsOrgResolved(true);
      } catch (error) {
        console.error('❌ AuthProvider: Error during initialization:', error);
        setLoading(false);
        setIsOrgResolved(true);
      }
    };

    // Initialize session on mount
    initializeSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [clearAuth, setCurrentOrganization, setMembership, setOrganizations, setUser, setLoading, setIsOrgResolved]);

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
