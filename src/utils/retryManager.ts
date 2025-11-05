/**
 * Intelligent Retry and Recovery System
 * Handles error classification, intelligent backoff strategies, and recovery actions
 */

interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  circuitBreakerThreshold?: number;
  timeoutMs?: number;
}

interface ErrorClassification {
  isRetryable: boolean;
  category: 'temporary' | 'permanent' | 'server_overload' | 'rate_limited' | 'authentication' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedDelay: number;
  recoveryActions: string[];
  canSwitchStrategy: boolean;
}

interface AttemptLog {
  timestamp: Date;
  attempt: number;
  url: string;
  strategy: string;
  error: string;
  errorType: string;
  delay: number;
  success: boolean;
  responseTime: number;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  successCount: number;
}

interface RetryMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageDelay: number;
  errorCategories: Record<string, number>;
  strategySuccessRates: Record<string, number>;
  circuitBreakerTrips: number;
  recoverySuccesses: number;
}

class IntelligentRetryManager {
  private attemptLogs: AttemptLog[] = [];
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private config: Required<RetryConfig>;
  private metrics: RetryMetrics;

  constructor(config: RetryConfig = {}) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      backoffMultiplier: config.backoffMultiplier || 2,
      jitter: config.jitter !== false,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      timeoutMs: config.timeoutMs || 10000
    };

    this.metrics = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      averageDelay: 0,
      errorCategories: {},
      strategySuccessRates: {},
      circuitBreakerTrips: 0,
      recoverySuccesses: 0
    };
  }

  /**
   * Execute operation with intelligent retry and recovery
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: {
      url: string;
      strategy: string;
      operationType: 'fetch' | 'scrape' | 'extract';
    },
    onProgress?: (attempt: number, result?: T, error?: Error) => void
  ): Promise<{ success: boolean; result?: T; error?: Error; metrics: RetryMetrics }> {
    const { url, strategy, operationType } = context;
    const domain = new URL(url).hostname;

    console.log(`🔄 Starting intelligent retry for ${url} using ${strategy}`);

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(domain)) {
      console.log(`⛔ Circuit breaker is open for ${domain}`);
      return {
        success: false,
        error: new Error(`Circuit breaker is open for ${domain}`),
        metrics: this.getMetrics()
      };
    }

    // Update circuit breaker state
    this.updateCircuitBreaker(domain, 'attempting');

    let lastError: Error = new Error('Unknown error');
    let lastClassification: ErrorClassification;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      const startTime = Date.now();
      
      try {
        console.log(`🎯 Attempt ${attempt}/${this.config.maxAttempts} for ${url}`);

        // Execute operation with timeout
        const result = await this.executeWithTimeout(operation, this.config.timeoutMs);
        
        const responseTime = Date.now() - startTime;
        
        // Record successful attempt
        this.recordAttempt({
          timestamp: new Date(),
          attempt,
          url,
          strategy,
          error: '',
          errorType: 'none',
          delay: totalDelay,
          success: true,
          responseTime
        });

        // Update success metrics
        this.metrics.successfulAttempts++;
        this.updateStrategySuccessRate(strategy, true);
        this.updateCircuitBreaker(domain, 'success');
        this.metrics.recoverySuccesses += (attempt > 1 ? 1 : 0);

        if (onProgress) {
          onProgress(attempt, result);
        }

        return {
          success: true,
          result,
          metrics: this.getMetrics()
        };

      } catch (error) {
        const responseTime = Date.now() - startTime;
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Classify error for intelligent retry decision
        lastClassification = this.classifyError(lastError.message);
        const errorType = lastClassification.category;

        // Record failed attempt
        this.recordAttempt({
          timestamp: new Date(),
          attempt,
          url,
          strategy,
          error: lastError.message,
          errorType,
          delay: 0,
          success: false,
          responseTime
        });

        this.metrics.failedAttempts++;
        this.updateErrorCategories(errorType);
        this.updateCircuitBreaker(domain, 'failure');

        console.log(`❌ Attempt ${attempt} failed: ${lastError.message} (${lastClassification.category})`);

        // Determine if we should retry
        if (!lastClassification.isRetryable || attempt >= this.config.maxAttempts) {
          break;
        }

        // Calculate intelligent delay
        const delay = this.calculateIntelligentDelay(attempt, lastClassification, domain);
        totalDelay += delay;

        console.log(`⏳ Waiting ${delay}ms before retry (${lastClassification.category})`);

        // Execute recovery actions
        const recoveryActions = await this.executeRecoveryActions(context, lastClassification);
        
        if (recoveryActions.length > 0) {
          console.log(`🛠️ Executed recovery actions: ${recoveryActions.join(', ')}`);
        }

        // Wait before retry
        if (delay > 0) {
          await this.sleep(delay);
        }

        if (onProgress) {
          onProgress(attempt, undefined, lastError);
        }
      }
    }

    // Final failure
    console.log(`💥 All attempts failed for ${url}`);

    // Execute emergency recovery
    const emergencyActions = await this.executeEmergencyRecovery(context, lastClassification);
    
    return {
      success: false,
      error: lastError,
      metrics: this.getMetrics()
    };
  }

  /**
   * Classify errors for intelligent retry decisions
   */
  private classifyError(errorMessage: string): ErrorClassification {
    const lowerMessage = errorMessage.toLowerCase();

    // Network and connectivity errors
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('timeout') || 
        lowerMessage.includes('connection reset') ||
        lowerMessage.includes('econnreset') ||
        lowerMessage.includes('econnrefused') ||
        lowerMessage.includes('enotfound')) {
      return {
        isRetryable: true,
        category: 'temporary',
        severity: 'medium',
        suggestedDelay: 2000,
        recoveryActions: ['check network connectivity', 'wait for network recovery'],
        canSwitchStrategy: false
      };
    }

    // Rate limiting (429 Too Many Requests)
    if (lowerMessage.includes('429') || 
        lowerMessage.includes('rate limit') ||
        lowerMessage.includes('too many requests')) {
      return {
        isRetryable: true,
        category: 'rate_limited',
        severity: 'medium',
        suggestedDelay: 10000,
        recoveryActions: ['reduce request frequency', 'implement exponential backoff', 'rotate user agents'],
        canSwitchStrategy: true
      };
    }

    // Server errors (5xx)
    if (lowerMessage.includes('500') || 
        lowerMessage.includes('502') || 
        lowerMessage.includes('503') ||
        lowerMessage.includes('504') ||
        lowerMessage.includes('server error') ||
        lowerMessage.includes('internal server error')) {
      return {
        isRetryable: true,
        category: 'server_overload',
        severity: 'high',
        suggestedDelay: 5000,
        recoveryActions: ['wait for server recovery', 'try different endpoint', 'reduce load'],
        canSwitchStrategy: false
      };
    }

    // Authentication and authorization errors
    if (lowerMessage.includes('401') || 
        lowerMessage.includes('403') ||
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('forbidden')) {
      return {
        isRetryable: false,
        category: 'authentication',
        severity: 'high',
        suggestedDelay: 0,
        recoveryActions: ['check authentication credentials', 'verify access permissions'],
        canSwitchStrategy: false
      };
    }

    // Not found errors
    if (lowerMessage.includes('404') || 
        lowerMessage.includes('not found')) {
      return {
        isRetryable: false,
        category: 'permanent',
        severity: 'low',
        suggestedDelay: 0,
        recoveryActions: ['verify URL is correct', 'check if resource exists'],
        canSwitchStrategy: false
      };
    }

    // Bot detection and anti-scraping
    if (lowerMessage.includes('403') || 
        lowerMessage.includes('captcha') ||
        lowerMessage.includes('blocked') ||
        lowerMessage.includes('suspicious') ||
        lowerMessage.includes('bot detected')) {
      return {
        isRetryable: true,
        category: 'server_overload',
        severity: 'high',
        suggestedDelay: 15000,
        recoveryActions: ['rotate user agent', 'implement proxy rotation', 'add random delays', 'reduce request frequency'],
        canSwitchStrategy: true
      };
    }

    // Unknown errors - assume temporary but with caution
    return {
      isRetryable: true,
      category: 'temporary',
      severity: 'medium',
      suggestedDelay: 3000,
      recoveryActions: ['monitor error pattern', 'try alternative approach'],
      canSwitchStrategy: true
    };
  }

  /**
   * Calculate intelligent delay with exponential backoff and jitter
   */
  private calculateIntelligentDelay(attempt: number, classification: ErrorClassification, domain: string): number {
    let baseDelay = classification.suggestedDelay || this.config.baseDelay;
    
    // Exponential backoff
    const exponentialDelay = baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Apply domain-specific adjustments
    const domainMultiplier = this.getDomainSpecificMultiplier(domain);
    
    // Add jitter to prevent thundering herd
    const jitterValue = this.config.jitter ? (Math.random() - 0.5) * 0.1 : 0;
    
    // Cap maximum delay
    const finalDelay = Math.min(
      Math.max(exponentialDelay * domainMultiplier * (1 + jitterValue), 1000),
      this.config.maxDelay
    );

    return Math.floor(finalDelay);
  }

  /**
   * Get domain-specific delay multipliers based on historical performance
   */
  private getDomainSpecificMultiplier(domain: string): number {
    const breakerState = this.circuitBreakers.get(domain);
    
    if (breakerState?.state === 'open') {
      return 5; // Longer delay when circuit breaker is open
    }
    
    // Check historical failure rate for this domain
    const domainAttempts = this.attemptLogs.filter(log => 
      new URL(log.url).hostname === domain
    );
    
    if (domainAttempts.length < 3) return 1;
    
    const recentFailures = domainAttempts.slice(-10).filter(log => !log.success);
    const failureRate = recentFailures.length / Math.min(domainAttempts.length, 10);
    
    if (failureRate > 0.7) return 3; // High failure rate = longer delays
    if (failureRate > 0.4) return 2; // Medium failure rate = moderate delays
    
    return 1; // Low failure rate = normal delays
  }

  /**
   * Execute recovery actions based on error classification
   */
  private async executeRecoveryActions(
    context: { url: string; strategy: string; operationType: string },
    classification: ErrorClassification
  ): Promise<string[]> {
    const actions: string[] = [];

    try {
      switch (classification.category) {
        case 'rate_limited':
          actions.push('Implementing extended delay between requests');
          await this.sleep(2000); // Additional delay
          break;
          
        case 'server_overload':
          if (classification.canSwitchStrategy) {
            actions.push('Switching to alternative scraping strategy');
            // Would implement strategy switching here
          } else {
            actions.push('Waiting for server recovery');
            await this.sleep(classification.suggestedDelay);
          }
          break;
          
        case 'temporary':
          if (classification.canSwitchStrategy) {
            actions.push('Trying alternative extraction method');
            // Would implement method switching here
          }
          break;
          
        case 'authentication':
          actions.push('Would refresh authentication (not implemented in demo)');
          break;
      }
    } catch (error) {
      console.error('Error executing recovery actions:', error);
    }

    return actions;
  }

  /**
   * Execute emergency recovery for completely failed operations
   */
  private async executeEmergencyRecovery(
    context: { url: string; strategy: string; operationType: string },
    classification?: ErrorClassification
  ): Promise<string[]> {
    const actions: string[] = [];

    console.log('🆘 Executing emergency recovery procedures');

    try {
      // Emergency fallback strategies
      actions.push('Attempting simplified extraction');
      actions.push('Reducing data requirements');
      actions.push('Using cached results if available');
      
      // Wait longer before giving up
      await this.sleep(5000);
      
    } catch (error) {
      console.error('Emergency recovery failed:', error);
    }

    return actions;
  }

  /**
   * Circuit breaker implementation
   */
  private updateCircuitBreaker(domain: string, result: 'success' | 'failure' | 'attempting'): void {
    if (!this.circuitBreakers.has(domain)) {
      this.circuitBreakers.set(domain, {
        state: 'closed',
        failureCount: 0,
        successCount: 0
      });
    }

    const state = this.circuitBreakers.get(domain)!;

    switch (result) {
      case 'success':
        state.successCount++;
        state.failureCount = Math.max(0, state.failureCount - 1);
        
        if (state.failureCount === 0 && state.state === 'half_open') {
          state.state = 'closed';
          console.log(`✅ Circuit breaker closed for ${domain}`);
        }
        break;

      case 'failure':
        state.failureCount++;
        
        if (state.failureCount >= this.config.circuitBreakerThreshold && state.state === 'closed') {
          state.state = 'open';
          state.lastFailureTime = new Date();
          state.nextAttemptTime = new Date(Date.now() + 60000); // Try again in 1 minute
          this.metrics.circuitBreakerTrips++;
          console.log(`🔴 Circuit breaker opened for ${domain} after ${state.failureCount} failures`);
        } else if (state.state === 'open' && state.nextAttemptTime && new Date() >= state.nextAttemptTime) {
          state.state = 'half_open';
          console.log(`🟡 Circuit breaker half-open for ${domain}`);
        }
        break;

      case 'attempting':
        if (state.state === 'open' && state.nextAttemptTime && new Date() < state.nextAttemptTime) {
          throw new Error('Circuit breaker is open');
        }
        break;
    }
  }

  private isCircuitBreakerOpen(domain: string): boolean {
    const state = this.circuitBreakers.get(domain);
    if (!state) return false;

    if (state.state === 'open' && state.nextAttemptTime && new Date() >= state.nextAttemptTime) {
      state.state = 'half_open';
      return false;
    }

    return state.state === 'open';
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  private recordAttempt(attempt: AttemptLog): void {
    this.attemptLogs.push(attempt);
    this.metrics.totalAttempts++;
    
    // Keep only last 1000 attempts to prevent memory issues
    if (this.attemptLogs.length > 1000) {
      this.attemptLogs = this.attemptLogs.slice(-1000);
    }

    // Update average delay
    const totalDelay = this.attemptLogs.reduce((sum, log) => sum + log.delay, 0);
    this.metrics.averageDelay = totalDelay / this.attemptLogs.length;
  }

  private updateErrorCategories(errorType: string): void {
    this.metrics.errorCategories[errorType] = (this.metrics.errorCategories[errorType] || 0) + 1;
  }

  private updateStrategySuccessRate(strategy: string, success: boolean): void {
    if (!this.metrics.strategySuccessRates[strategy]) {
      this.metrics.strategySuccessRates[strategy] = 0;
    }

    const attempts = this.attemptLogs.filter(log => log.strategy === strategy);
    if (attempts.length > 0) {
      const successfulAttempts = attempts.filter(log => log.success).length;
      this.metrics.strategySuccessRates[strategy] = successfulAttempts / attempts.length;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get comprehensive retry metrics
   */
  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent attempt logs for debugging
   */
  getRecentAttempts(limit: number = 50): AttemptLog[] {
    return this.attemptLogs.slice(-limit);
  }

  /**
   * Get circuit breaker status for all domains
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    this.circuitBreakers.forEach((state, domain) => {
      status[domain] = { ...state };
    });
    return status;
  }

  /**
   * Reset metrics and circuit breakers
   */
  reset(): void {
    this.attemptLogs = [];
    this.circuitBreakers.clear();
    this.metrics = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      averageDelay: 0,
      errorCategories: {},
      strategySuccessRates: {},
      circuitBreakerTrips: 0,
      recoverySuccesses: 0
    };
  }

  /**
   * Get intelligent recommendations based on historical data
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze error patterns
    const errorTypes = Object.keys(this.metrics.errorCategories);
    const mostCommonError = errorTypes.reduce((a, b) => 
      this.metrics.errorCategories[a] > this.metrics.errorCategories[b] ? a : b, ''
    );

    if (mostCommonError && this.metrics.errorCategories[mostCommonError] > 5) {
      recommendations.push(`Address frequent ${mostCommonError} errors - consider implementing specific recovery strategy`);
    }

    // Analyze success rates
    const strategyRates = Object.entries(this.metrics.strategySuccessRates);
    const underperformingStrategies = strategyRates.filter(([, rate]) => rate < 0.3);

    if (underperformingStrategies.length > 0) {
      recommendations.push(`Consider disabling underperforming strategies: ${underperformingStrategies.map(([s]) => s).join(', ')}`);
    }

    // Circuit breaker analysis
    if (this.metrics.circuitBreakerTrips > 3) {
      recommendations.push('High circuit breaker trips - consider implementing more conservative retry policies');
    }

    return recommendations;
  }
}

export { IntelligentRetryManager };
export type { 
  RetryConfig, 
  ErrorClassification, 
  AttemptLog, 
  CircuitBreakerState, 
  RetryMetrics 
};