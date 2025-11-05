import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isConnected } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useOrganizationCache } from '../hooks/useOrganizationCache';
import { authRecoveryService } from '../services/authRecoveryService';
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

// Configuration
const DEBOUNCE_DELAY = 800; // Reduced debounce delay

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

  const {
    getCachedData,
    cacheData,
    loadFromCache,
    updateCache,
  } = useOrganizationCache();

  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAuthEventRef = useRef<string>('');
  const authInitializedRef = useRef(false);
  
  // Robust organization fetch with comprehensive error handling
  const fetchOrganizationsRobustly = useCallback(async (userId: string, forceRefresh = false) => {
    if (isFetchingRef.current && !forceRefresh) {
      console.log('🔄 AuthProvider: Organization fetch already in progress, skipping');
      return;
    }

    // Strategy 1: Use cache immediately if available and not forcing refresh
    if (!forceRefresh) {
      const cachedData = getCachedData(userId);
      if (cachedData) {
        console.log('📦 AuthProvider: Using cached organizations:', cachedData.organizations.length);
        setOrganizations(cachedData.organizations || []);
        setCurrentOrganization(cachedData.organizations?.[0] || null);
        setMembership(cachedData.membership || null);
        setIsOrgResolved(true);
        
        // Refresh in background if cache is older than 2 minutes
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge > 2 * 60 * 1000) {
          setTimeout(() => fetchOrganizationsRobustly(userId, true), 100);
        }
        return;
      }
    }

    isFetchingRef.current = true;
    
    try {
      console.log('🔄 AuthProvider: Using recovery service to fetch organizations');
      
      // Use the recovery service with comprehensive fallback strategies
      const result = await authRecoveryService.fetchOrganizationsWithRecovery(
        userId,
        getCachedData,
        (orgs, membership) => {
          setOrganizations(orgs);
          setCurrentOrganization(orgs?.[0] || null);
          setMembership(membership);
          setIsOrgResolved(true);
          
          // Cache the result if we have valid data
          if (orgs.length > 0 || membership) {
            cacheData(userId, { organizations: orgs, membership, timestamp: Date.now() });
          }
        }
      );

      if (result.success) {
        console.log(`✅ AuthProvider: Organizations fetched using strategy: ${result.strategy}`);
        if (result.data) {
          updateCache(userId, result.data.organizations, result.data.membership);
        }
      } else {
        console.warn('⚠️ AuthProvider: Recovery failed, using graceful degradation');
        // The recovery service already set fallback data
      }
    } catch (error) {
      console.error('❌ AuthProvider: Critical error in organization fetch:', error);
      // Even on critical error, don't leave the user hanging
      setOrganizations([]);
      setCurrentOrganization(null);
      setMembership(null);
      setIsOrgResolved(true);
    } finally {
      isFetchingRef.current = false;
    }
  }, [getCachedData, cacheData, updateCache, setOrganizations, setCurrentOrganization, setMembership, setIsOrgResolved]);

  // Debounced organization fetch
  const debouncedFetchOrganizations = useCallback((userId: string, forceRefresh = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      fetchOrganizationsRobustly(userId, forceRefresh);
    }, DEBOUNCE_DELAY);
  }, [fetchOrganizationsRobustly]);

  // Enhanced cleanup
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

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
        
        // Prevent duplicate events
        const eventKey = `${event}_${session?.user?.id}`;
        if (lastAuthEventRef.current === eventKey && event !== 'SIGNED_OUT') {
          console.log('🔄 AuthProvider: Duplicate auth event, skipping');
          return;
        }
        lastAuthEventRef.current = eventKey;

        // When the user signs out, clear all auth-related state.
        if (event === 'SIGNED_OUT') {
          console.log('🚪 AuthProvider: User signed out, clearing auth state');
          cleanup();
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
          // Use debounced fetch to prevent rapid successive calls
          debouncedFetchOrganizations(currentUser.id);
        } else {
          // Clear cache for no user
          cleanup();
          setOrganizations([]);
          setCurrentOrganization(null);
          setMembership(null);
          setIsOrgResolved(true);
          setLoading(false);
        }
      }
    );

    // Initial session check
    const initializeSession = async () => {
      if (authInitializedRef.current) return; // Prevent double initialization
      authInitializedRef.current = true;
      
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
          // Try to load from cache first
          const loadedFromCache = loadFromCache(session.user.id);
          
          if (!loadedFromCache) {
            // No cache available, fetch fresh data
            setTimeout(() => debouncedFetchOrganizations(session.user.id), 100);
          } else {
            // Have cache, refresh in background
            setTimeout(() => debouncedFetchOrganizations(session.user.id, true), 2000);
          }
          
          setIsOrgResolved(true);
        } else {
          setLoading(false);
          setIsOrgResolved(true);
        }
      } catch (error) {
        console.error('❌ AuthProvider: Error during initialization:', error);
        setLoading(false);
        setIsOrgResolved(true);
      } finally {
        setLoading(false);
      }
    };

    // Initialize session on mount
    initializeSession();

    return () => {
      subscription.unsubscribe();
      cleanup();
    };
  }, [clearAuth, setCurrentOrganization, setMembership, setOrganizations, setUser, setLoading, setIsOrgResolved, debouncedFetchOrganizations, loadFromCache, cleanup]);

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
