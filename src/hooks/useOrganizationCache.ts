import { useState, useEffect, useCallback } from 'react';
import { Organization, OrganizationMember } from '../types';
import { useAuthStore } from '../stores/authStore';

// Cache key for organization storage
const ORG_CACHE_KEY = 'auth_organizations_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedOrgData {
  organizations: Organization[];
  membership: OrganizationMember | null;
  timestamp: number;
}

export const useOrganizationCache = () => {
  const { 
    organizations, 
    currentOrganization, 
    membership, 
    setOrganizations, 
    setCurrentOrganization, 
    setMembership 
  } = useAuthStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get cached organization data
  const getCachedData = useCallback((userId: string): CachedOrgData | null => {
    try {
      const cached = localStorage.getItem(`${ORG_CACHE_KEY}_${userId}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isValid = Date.now() - timestamp < CACHE_TTL;
        if (isValid) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to read organization cache:', error);
    }
    return null;
  }, []);

  // Cache organization data
  const cacheData = useCallback((userId: string, data: CachedOrgData) => {
    try {
      const cacheData = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem(`${ORG_CACHE_KEY}_${userId}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache organization data:', error);
    }
  }, []);

  // Clear cache for a user
  const clearCache = useCallback((userId: string) => {
    try {
      localStorage.removeItem(`${ORG_CACHE_KEY}_${userId}`);
    } catch (error) {
      console.warn('Failed to clear organization cache:', error);
    }
  }, []);

  // Load cached data into store
  const loadFromCache = useCallback((userId: string) => {
    const cachedData = getCachedData(userId);
    if (cachedData) {
      setOrganizations(cachedData.organizations || []);
      setCurrentOrganization(cachedData.organizations?.[0] || null);
      setMembership(cachedData.membership || null);
      return true;
    }
    return false;
  }, [getCachedData, setOrganizations, setCurrentOrganization, setMembership]);

  // Update cached data in store
  const updateCache = useCallback((userId: string, organizations: Organization[], membership: OrganizationMember | null) => {
    cacheData(userId, { organizations, membership, timestamp: Date.now() });
    setOrganizations(organizations);
    setCurrentOrganization(organizations?.[0] || null);
    setMembership(membership);
  }, [cacheData, setOrganizations, setCurrentOrganization, setMembership]);

  return {
    organizations,
    currentOrganization,
    membership,
    isRefreshing,
    getCachedData,
    cacheData,
    clearCache,
    loadFromCache,
    updateCache,
    setIsRefreshing,
  };
};