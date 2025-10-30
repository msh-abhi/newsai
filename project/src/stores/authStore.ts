import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { Organization, OrganizationMember } from '../types';

// Define the shape of your application's state
interface AuthState {
  user: User | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  membership: OrganizationMember | null;
  loading: boolean;
  isOrgResolved: boolean; // FIX: Keep only one declaration
}

// Define the methods that can mutate the state
interface AuthActions {
  setUser: (user: User | null) => void;
  setOrganizations: (organizations: Organization[]) => void;
  setCurrentOrganization: (organization: Organization | null) => void;
  setMembership: (membership: OrganizationMember | null) => void;
  setLoading: (loading: boolean) => void;
  setIsOrgResolved: (resolved: boolean) => void; // FIX: Keep only one declaration
  clearAuth: () => void;
}

// Create the Zustand store by combining the state and actions
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // Initial State
  user: null,
  organizations: [],
  currentOrganization: null,
  membership: null,
  loading: true,
  isOrgResolved: false, // FIX: Keep only one declaration here

  // Actions
  setUser: (user) => set({ user }),
  setOrganizations: (organizations) => set({ organizations }),
  setCurrentOrganization: (organization) => set({ currentOrganization: organization }),
  setMembership: (membership) => set({ membership }),
  setLoading: (loading) => set({ loading }),
  setIsOrgResolved: (resolved) => set({ isOrgResolved: resolved }), // FIX: Keep only one declaration here
  
  clearAuth: () => set({
    user: null,
    organizations: [],
    currentOrganization: null,
    membership: null,
    loading: false,
    isOrgResolved: false, // FIX: Keep only one declaration here
  }),
}));