import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Organization, OrganizationMember } from '../types';
import toast from 'react-hot-toast';

export const useOrganizations = () => {
  const queryClient = useQueryClient();
  const { setOrganizations, setCurrentOrganization, setMembership } = useAuthStore();

  const fetchUserOrganizations = useCallback(async (userId: string) => {
    try {
      console.log('useOrganizations: Fetching organizations for user:', userId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.error) {
        console.log('useOrganizations: No session found, clearing organization state');
        setOrganizations([]);
        setCurrentOrganization(null);
        setMembership(null);
        throw new Error('No valid session found');
      }

      // Fetch user's organizations
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', userId);

      if (error) {
        // Handle specific error cases
        if (error.code === 'PGRST116') {
          // No rows found - user has no organizations yet
          console.log('useOrganizations: No organizations found for user');
          setOrganizations([]);
          setCurrentOrganization(null);
          setMembership(null);
          return { organizations: [], membership: null };
        }
        
        if (error.code === 'SUPABASE_NOT_CONNECTED' || error.code === 'SUPABASE_CONNECTION_ERROR') {
          console.error('useOrganizations: Database not connected:', error);
          throw new Error('Database connection failed. Please connect to Supabase first.');
        }
        
        console.error('useOrganizations: Database error fetching organizations:', error);
        throw error; // Re-throw to let caller handle
      }

      // Handle case where data is null or empty
      if (!data || data.length === 0) {
        console.log('useOrganizations: Empty data returned, user has no organizations');
        setOrganizations([]);
        setCurrentOrganization(null);
        setMembership(null);
        return { organizations: [], membership: null };
      }

      const organizations = data.map(member => member.organization).filter(Boolean) || [];
      const firstOrg = organizations[0];
      const firstMembership = data?.[0];

      console.log('useOrganizations: Found organizations:', organizations.length);
      
      setOrganizations(organizations);
      setCurrentOrganization(firstOrg || null);
      setMembership(firstMembership || null);

      return { organizations, membership: firstMembership };
    } catch (error) {
      console.error('useOrganizations: Unexpected error fetching organizations:', error);
      // Set empty state on error
      setOrganizations([]);
      setCurrentOrganization(null);
      setMembership(null);
      throw error; // Re-throw to let caller handle
    }
  }, [setOrganizations, setCurrentOrganization, setMembership]);

  const createOrganization = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      try {
        // First, verify we have a valid session and connection
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Test database connection before attempting to create
        const { error: testError } = await supabase.from('organizations').select('count').limit(1);
        if (testError) {
          if (testError.message?.includes('relation') && testError.message?.includes('does not exist')) {
            throw new Error('Database tables not found. Please connect to Supabase first.');
          }
          throw testError;
        }

        console.log('🏢 useOrganizations: Creating organization:', { name, slug });

        // Create organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name,
            slug,
            created_by: user.id,
            plan: 'free',
            settings: {
              max_newsletters_per_month: 10,
              max_team_members: 3,
              custom_branding: false,
              api_access: false,
            }
          })
          .select()
          .single();

        if (orgError) throw orgError;
        console.log('✅ useOrganizations: Organization created:', org.id);

        // Add user as owner
        const { data: membership, error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.id,
            user_id: user.id,
            role: 'owner'
          })
          .select()
          .single();

        if (memberError) throw memberError;
        console.log('✅ useOrganizations: Membership created:', membership.id);

        // Update the auth store immediately with the new organization
        console.log('🔄 useOrganizations: Updating auth store with new organization');
        setCurrentOrganization(org);
        setMembership(membership);
        setOrganizations(prev => [...prev, org]);

        return { organization: org, membership };
      } catch (error: any) {
        // Enhanced error handling with specific error codes and messages
        console.error('Organization creation error:', error);
        
        // Handle specific Supabase error codes
        if (error.code === '23505') {
          // Unique constraint violation
          if (error.message?.includes('organizations_slug_key')) {
            throw new Error('This organization name is already taken. Please choose a different name.');
          }
          throw new Error('An organization with this information already exists. Please use different details.');
        }
        
        if (error.code === '42P01') {
          // Table doesn't exist
          throw new Error('Database not set up. Please connect to Supabase first by clicking the "Connect to Supabase" button.');
        }
        
        if (error.code === 'SUPABASE_NOT_CONNECTED' || error.code === 'SUPABASE_CONNECTION_ERROR') {
          throw new Error('Database connection failed. Please connect to Supabase first.');
        }
        
        if (error.code === 'PGRST301') {
          // RLS policy violation - likely missing INSERT policy
          throw new Error('Permission denied. This might be due to missing database policies. Please ensure your Supabase setup is complete.');
        }
        
        if (error.message?.includes('JWT')) {
          throw new Error('Authentication expired. Please sign out and sign back in.');
        }
        
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          throw new Error('Database tables not found. Please connect to Supabase first.');
        }
        
        if (error.message?.includes('fetch')) {
          throw new Error('Network connection error. Please check your internet connection and Supabase configuration.');
        }
        
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error('Network connection error. Please check your internet connection and try again.');
        }
        
        // Generic fallback with original error for debugging
        if (error.message) {
          throw new Error(`Failed to create organization: ${error.message}`);
        }
        
        throw new Error('An unexpected error occurred while creating your organization. Please try again.');
      }
    },
    onSuccess: async (result) => {
      console.log('🎉 useOrganizations: Organization creation successful');
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization created successfully!');
      
      // Force a small delay to ensure state is properly updated
      setTimeout(() => {
        console.log('🔄 useOrganizations: Triggering page refresh after organization creation');
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      // Enhanced error display with better UX
      const errorMessage = error.message || 'Failed to create organization';
      
      // Show different toast types based on error severity
      if (errorMessage.includes('Database not set up') || errorMessage.includes('connect to Supabase')) {
        toast.error(errorMessage, { 
          duration: 8000,
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #F59E0B',
          }
        });
      } else if (errorMessage.includes('already taken') || errorMessage.includes('already exists')) {
        toast.error(errorMessage, { duration: 6000 });
      } else {
        toast.error(errorMessage, { duration: 5000 });
      }
      
      console.error('Create organization error:', error);
    }, 
  });

  return {
    fetchUserOrganizations,
    createOrganization,
  };
};