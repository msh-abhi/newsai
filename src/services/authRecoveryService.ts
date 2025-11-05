import { supabase } from '../lib/supabase';
import { Organization, OrganizationMember } from '../types';

// Recovery strategies for different error scenarios
export enum RecoveryStrategy {
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  USE_CACHE = 'use_cache',
  OFFLINE_MODE = 'offline_mode',
  GRACEFUL_DEGRADATION = 'graceful_degradation'
}

interface RecoveryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  enableOfflineMode: boolean;
}

const DEFAULT_CONFIG: RecoveryConfig = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 5000,
  enableOfflineMode: true
};

interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  strategy: RecoveryStrategy;
  metadata?: any;
}

export class AuthRecoveryService {
  private config: RecoveryConfig;
  private offlineStorage: Map<string, any> = new Map();

  constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Attempt to fetch organizations with multiple recovery strategies
   */
  async fetchOrganizationsWithRecovery(
    userId: string,
    useCache: (userId: string) => any,
    setFallbackData: (orgs: Organization[], membership: OrganizationMember | null) => void
  ): Promise<RecoveryResult<{ organizations: Organization[], membership: OrganizationMember | null }>> {

    // Strategy 1: Try to use cached data first
    const cachedData = useCache(userId);
    if (cachedData) {
      console.log('📦 AuthRecovery: Using cached organization data');
      setFallbackData(cachedData.organizations, cachedData.membership);
      return {
        success: true,
        data: cachedData,
        strategy: RecoveryStrategy.USE_CACHE
      };
    }

    // Strategy 2: Retry with backoff for network issues
    try {
      const result = await this.retryWithBackoff(() => this.fetchOrganizations(userId));
      
      if (result.success && result.data) {
        return result;
      }
    } catch (error) {
      console.warn('⚠️ AuthRecovery: Network fetch failed, trying offline strategies');
    }

    // Strategy 3: Offline mode with localStorage fallback
    if (this.config.enableOfflineMode) {
      try {
        const offlineData = this.getOfflineData(userId);
        if (offlineData) {
          console.log('🔄 AuthRecovery: Using offline data');
          setFallbackData(offlineData.organizations, offlineData.membership);
          return {
            success: true,
            data: offlineData,
            strategy: RecoveryStrategy.OFFLINE_MODE,
            metadata: { source: 'localStorage' }
          };
        }
      } catch (error) {
        console.warn('⚠️ AuthRecovery: Offline data unavailable');
      }
    }

    // Strategy 4: Graceful degradation with minimal data
    console.log('🛡️ AuthRecovery: Entering graceful degradation mode');
    setFallbackData([], null);
    
    return {
      success: false,
      error: new Error('All recovery strategies failed'),
      strategy: RecoveryStrategy.GRACEFUL_DEGRADATION
    };
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.config.maxRetries
  ): Promise<RecoveryResult<T>> {
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        const data = await operation();
        const duration = Date.now() - startTime;
        
        console.log(`✅ AuthRecovery: Operation succeeded on attempt ${attempt + 1} (${duration}ms)`);
        
        return {
          success: true,
          data,
          strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
          metadata: { attempts: attempt + 1, duration }
        };
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ AuthRecovery: Attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt < retries) {
          const delay = Math.min(
            this.config.baseDelay * Math.pow(2, attempt),
            this.config.maxDelay
          );
          
          console.log(`🔄 AuthRecovery: Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return {
      success: false,
      error: lastError!,
      strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
      metadata: { attempts: retries + 1 }
    };
  }

  /**
   * Fetch organizations from Supabase
   */
  private async fetchOrganizations(userId: string): Promise<{ organizations: Organization[], membership: OrganizationMember | null }> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`*, organization:organizations(*)`)
      .eq('user_id', userId);

    if (error) {
      // Don't retry on "no organizations found" errors
      if (error.code === 'PGRST116') {
        return { organizations: [], membership: null };
      }
      throw error;
    }

    const organizations = data.map((member: any) => member.organization).filter(Boolean) as Organization[] || [];
    const membership = data?.[0] || null;

    // Store in offline storage for future use
    this.setOfflineData(userId, { organizations, membership });
    
    return { organizations, membership };
  }

  /**
   * Store data in offline storage
   */
  private setOfflineData(userId: string, data: any): void {
    try {
      const storageKey = `offline_orgs_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }));
      
      this.offlineStorage.set(userId, data);
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  }

  /**
   * Get data from offline storage
   */
  private getOfflineData(userId: string): any {
    try {
      const storageKey = `offline_orgs_${userId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const { data, expiresAt } = JSON.parse(stored);
        
        if (Date.now() < expiresAt) {
          return data;
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve offline data:', error);
    }
    
    return null;
  }

  /**
   * Check if we're in offline mode
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Clear all cached data for a user
   */
  clearUserCache(userId: string): void {
    try {
      localStorage.removeItem(`auth_organizations_cache_${userId}`);
      localStorage.removeItem(`offline_orgs_${userId}`);
      this.offlineStorage.delete(userId);
    } catch (error) {
      console.warn('Failed to clear user cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(userId: string): any {
    try {
      const primaryCache = localStorage.getItem(`auth_organizations_cache_${userId}`);
      const offlineCache = localStorage.getItem(`offline_orgs_${userId}`);
      
      return {
        hasPrimaryCache: !!primaryCache,
        hasOfflineCache: !!offlineCache,
        isOffline: this.isOffline(),
        offlineStorageSize: this.offlineStorage.size
      };
    } catch (error) {
      return { error: 'Failed to get cache stats' };
    }
  }
}

// Export singleton instance
export const authRecoveryService = new AuthRecoveryService();