import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Requested-With",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

interface EventSource {
  id: string;
  name: string;
  url: string;
  keywords: string[];
  location: {
    city: string;
    state: string;
    radius: number;
  };
  scraping_config?: {
    selector?: string;
    title_selector?: string;
    date_selector?: string;
    location_selector?: string;
    link_selector?: string;
    description_selector?: string;
  };
  performance_metrics?: {
    last_success?: boolean;
    events_found?: number;
    last_error?: string;
    last_attempt?: string;
    success_rate?: number;
    avg_response_time?: number;
  };
}

interface ScrapedEvent {
  title: string;
  description?: string;
  date_start: string;
  date_end?: string;
  location?: string;
  url?: string;
  source_name: string;
  source_id: string;
  keywords_matched: string[];
  relevance_score: number;
  metadata: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { organization_id, source_ids, test_mode = false, force_refresh = false } = await req.json();

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    console.log(`🚀 Starting event scraping for org: ${organization_id}`);

    // Check if filtering is enabled for this organization
    const { data: filterSettings, error: filterError } = await supabase
      .from('scraping_filters')
      .select('filter_enabled')
      .eq('organization_id', organization_id)
      .single();

    console.log(`🔍 Filter query result:`, { filterSettings, filterError });

    const shouldFilter = filterSettings?.filter_enabled ?? false; // Default to false (no filtering) if not set
    console.log(`🔍 Filtering ${shouldFilter ? 'ENABLED' : 'DISABLED'} for organization ${organization_id}`);
    console.log(`🔍 Filter settings:`, filterSettings);

    let query = supabase
      .from("event_sources")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("is_active", true);

    if (source_ids && source_ids.length > 0) {
      query = query.in("id", source_ids);
    }

    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) throw sourcesError;
    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active event sources found",
          total_events: 0,
          sources_processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Found ${sources.length} active sources to scrape`);

    // Filter out recently scraped sources to avoid unnecessary API calls
    const recentlyScrapedSources = sources.filter((source: any) => {
      const lastScraped = source.last_scraped_at;
      if (!lastScraped) return false;

      const lastScrapedTime = new Date(lastScraped).getTime();
      const now = Date.now();
      const hoursSinceLastScrape = (now - lastScrapedTime) / (1000 * 60 * 60);

      // Skip sources scraped within the last 12 hours for better freshness
      return hoursSinceLastScrape < 12;
    });

    const sourcesToScrape = sources.filter((source: any) =>
      !recentlyScrapedSources.some((recent: any) => recent.id === source.id)
    );

    // Intelligent source prioritization and batching
    const sourcesToProcess = force_refresh ? sources : sourcesToScrape;
    
    // If no force refresh and too many sources, prioritize and batch
    if (!force_refresh && sourcesToProcess.length > 10) {
      const prioritySources = sourcesToProcess
        .sort((a: any, b: any) => {
          // Prioritize sources with better success rates
          const aSuccess = a.performance_metrics?.success_rate || 0;
          const bSuccess = b.performance_metrics?.success_rate || 0;
          return bSuccess - aSuccess;
        })
        .slice(0, 10); // Limit to top 10 sources
      console.log(`🎯 Prioritized top ${prioritySources.length} sources for processing`);
    }

    console.log(`⏰ Skipping ${recentlyScrapedSources.length} recently scraped sources (12h cache)`);
    console.log(`🎯 Will scrape ${sourcesToProcess.length}/${sources.length} sources ${force_refresh ? '(force refresh enabled)' : ''}`);

    if (!force_refresh && sourcesToProcess.length === 0) {
      console.log(`✅ All sources recently scraped, returning cached results`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "All sources recently scraped, using cached results",
          total_events: 0, // Will be calculated from existing events
          sources_processed: 0,
          sources_skipped: recentlyScrapedSources.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process sources in smaller batches to prevent timeouts
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < sourcesToProcess.length; i += batchSize) {
      const batch = sourcesToProcess.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sourcesToProcess.length / batchSize)} (${batch.length} sources)`);
      
      const batchPromises = batch.map(async (source: any) => {
        try {
          const result = await scrapeEventSource(source as EventSource, organization_id, shouldFilter, supabase);
          return result;
        } catch (error) {
          console.error(`❌ Failed to scrape ${source.name}:`, error);
          return [];
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch processing error:', result.reason);
          results.push([]);
        }
      }
      
      // Add small delay between batches to be respectful to target servers
      if (i + batchSize < sourcesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const scrapedEvents: ScrapedEvent[] = results.flat();
    const successfulSources = results.filter(r => r.length > 0).length;

    console.log(`✅ Total events found: ${scrapedEvents.length} from ${successfulSources}/${sourcesToProcess.length} sources`);

    // Partial success logic: Save events if we have at least 8 successful sources OR any events at all
    const shouldSaveEvents = !test_mode && (successfulSources >= 8 || scrapedEvents.length > 0);

    if (shouldSaveEvents) {
      console.log(`💾 Saving ${scrapedEvents.length} events (${successfulSources} successful sources)`);

      const { error: insertError } = await supabase
        .from("events")
        .upsert(
          scrapedEvents.map((event) => ({
            ...event,
            organization_id,
          })),
          {
            onConflict: "organization_id,title,date_start,source_name",
            ignoreDuplicates: true,
          }
        );

      if (insertError) {
        console.error("Error inserting events:", insertError);
        // Don't throw error - partial success is still valuable
        console.warn("⚠️ Database save failed, but continuing with partial success");
      } else {
        console.log(`✅ Successfully saved ${scrapedEvents.length} events to database`);
      }
    } else {
      console.log(`⏭️ Not saving events: ${successfulSources} successful sources (need 8+ or any events)`);
    }

    const responseData = {
      success: true,
      message: test_mode
        ? `Test mode: Found ${scrapedEvents.length} events from ${successfulSources}/${sources.length} sources`
        : `Successfully scraped ${scrapedEvents.length} events from ${successfulSources}/${sources.length} sources`,
      total_events: scrapedEvents.length,
      sources_processed: successfulSources,
      sources_failed: sources.length - successfulSources,
      events: test_mode ? scrapedEvents : undefined,
    };

    console.log("✨ Scraping complete:", responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("💥 Event scraper error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        total_events: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Enhanced error handling and monitoring
function logScrapingError(sourceName: string, error: any, context: string = '') {
  const errorInfo = {
    source: sourceName,
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  };
  
  console.error(`🚨 Scraping error for ${sourceName}:`, errorInfo);
  
  // Also log to a specific error tracking system if available
  if (errorInfo.stack) {
    console.error(`📊 Full stack trace: ${errorInfo.stack}`);
  }
}

// Performance monitoring
class ScrapingMonitor {
  private startTime: number;
  private sourceCount: number = 0;
  private successCount: number = 0;
  private errorCount: number = 0;
  private eventsFound: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  recordSource(sourceName: string, success: boolean, eventsCount: number = 0) {
    this.sourceCount++;
    if (success) {
      this.successCount++;
      this.eventsFound += eventsCount;
    } else {
      this.errorCount++;
    }

    // Log progress every 5 sources
    if (this.sourceCount % 5 === 0) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const avgTime = elapsed / this.sourceCount;
      console.log(`📊 Progress: ${this.sourceCount} sources, ${this.successCount} successes, ${this.errorCount} errors, ${this.eventsFound} events (avg: ${avgTime.toFixed(1)}s/source)`);
    }
  }

  getSummary() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return {
      totalSources: this.sourceCount,
      successfulSources: this.successCount,
      failedSources: this.errorCount,
      totalEvents: this.eventsFound,
      elapsedTime: elapsed,
      successRate: this.sourceCount > 0 ? (this.successCount / this.sourceCount * 100).toFixed(1) : '0'
    };
  }
}

// Batch processing with concurrency limit
async function processBatch<T, R>(
  items: T[],
  concurrencyLimit: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrencyLimit) {
    const batch = items.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

async function scrapeEventSource(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean,
  supabase: any
): Promise<ScrapedEvent[]> {
  console.log(`🔍 Scraping: ${source.name} (${source.url})`);
  const sourceStartTime = Date.now();

  try {
    const events = await scrapeWithStrategies(source, organizationId, shouldFilter);
    const elapsed = ((Date.now() - sourceStartTime) / 1000).toFixed(1);
    console.log(`✅ Found ${events.length} events from ${source.name} (${elapsed}s)`);

    // Update success metrics
    const successRate = source.performance_metrics?.success_rate || 0;
    const newSuccessRate = successRate > 0 ? (successRate + 100) / 2 : 100;

    await supabase
      .from("event_sources")
      .update({
        last_scraped_at: new Date().toISOString(),
        performance_metrics: {
          last_success: true,
          events_found: events.length,
          last_error: null,
          last_attempt: new Date().toISOString(),
          success_rate: newSuccessRate,
          avg_response_time: ((source.performance_metrics?.avg_response_time || 0) + parseFloat(elapsed)) / 2,
        },
      })
      .eq("id", source.id);

    return events;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const elapsed = ((Date.now() - sourceStartTime) / 1000).toFixed(1);
    
    logScrapingError(source.name, error, `Failed after ${elapsed}s`);

    // Update failure metrics
    const successRate = source.performance_metrics?.success_rate || 0;
    const newSuccessRate = successRate > 0 ? successRate * 0.9 : 50; // Reduce success rate

    await supabase
      .from("event_sources")
      .update({
        performance_metrics: {
          last_success: false,
          events_found: 0,
          last_error: errorMessage,
          last_attempt: new Date().toISOString(),
          success_rate: newSuccessRate,
        },
      })
      .eq("id", source.id);

    return [];
  }
}

async function scrapeWithStrategies(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): Promise<ScrapedEvent[]> {

  // Strategy 1: ScraperAPI (most reliable for bot detection)
  try {
    const scraperApiKey = Deno.env.get("SCRAPER_API_KEY");
    if (scraperApiKey && scraperApiKey !== "your_scraperapi_key_here") {
      console.log(`🔄 Trying ScraperAPI for ${source.name}`);
      const events = await scrapeWithScraperAPI(source, organizationId, shouldFilter, scraperApiKey);
      if (events.length > 0) {
        console.log(`✅ ScraperAPI successful: ${events.length} events`);
        return events;
      }
    }
  } catch (error) {
    console.warn(`⚠️ ScraperAPI failed:`, error instanceof Error ? error.message : String(error));
  }

  // Strategy 2: Direct fetch with rotating user agents
  try {
    console.log(`🔄 Trying direct fetch for ${source.name}`);
    const events = await scrapeDirectWithRotation(source, organizationId, shouldFilter);
    if (events.length > 0) {
      console.log(`✅ Direct fetch successful: ${events.length} events`);
      return events;
    }
  } catch (error) {
    console.warn(`⚠️ Direct fetch failed:`, error instanceof Error ? error.message : String(error));
  }

  // Strategy 3: CORS proxy services
  try {
    console.log(`🔄 Trying CORS proxies for ${source.name}`);
    const events = await scrapeWithCorsProxies(source, organizationId, shouldFilter);
    if (events.length > 0) {
      console.log(`✅ CORS proxy successful: ${events.length} events`);
      return events;
    }
  } catch (error) {
    console.warn(`⚠️ CORS proxies failed:`, error instanceof Error ? error.message : String(error));
  }

  console.log(`❌ All strategies failed for ${source.name}`);
  return [];
}

// ScraperAPI - Handles bot detection, JavaScript rendering, and proxies
async function scrapeWithScraperAPI(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean,
  apiKey: string
): Promise<ScrapedEvent[]> {

  // Validate API key
  if (!apiKey || apiKey === "your_scraperapi_key_here" || apiKey.trim() === "") {
    console.warn(`⚠️ ScraperAPI key not configured or invalid for ${source.name}`);
    throw new Error("ScraperAPI key not configured");
  }

  const scraperApiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(source.url)}&render=true&wait_for=8000&premium=true`;

  // Retry logic for more resilience
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ScraperAPI attempt ${attempt}/${maxRetries} for ${source.name}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // Increased to 60s

      const response = await fetch(scraperApiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`ScraperAPI returned ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      if (!html || html.length < 100) {
        throw new Error("ScraperAPI returned insufficient content");
      }

      console.log(`✅ ScraperAPI successful on attempt ${attempt} - received ${html.length} characters`);
      return parseEventsBySource(html, source, organizationId, shouldFilter);

    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ ScraperAPI attempt ${attempt} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`ScraperAPI failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

// Direct fetch with rotating user agents and headers
async function scrapeDirectWithRotation(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): Promise<ScrapedEvent[]> {

  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0",
  ];

  for (const userAgent of userAgents) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout per attempt

      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          "DNT": "1",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "max-age=0",
        },
      });

      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        const events = parseEventsBySource(html, source, organizationId, shouldFilter);
        if (events.length > 0) {
          return events;
        }
      }
    } catch (error) {
      console.warn(`User agent ${userAgent.substring(0, 30)}... failed`);
      continue;
    }
  }

  return [];
}

// Parse events based on source URL - Use dynamic source URLs from database
function parseEventsBySource(
  html: string,
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): ScrapedEvent[] {

  const url = source.url.toLowerCase();

  // Use the source's configured scraping selectors if available
  if (source.scraping_config?.selector) {
    return scrapeWithCustomSelectors(html, source, organizationId, shouldFilter);
  }

  // Otherwise, use URL-based detection for known sites
  if (url.includes("eventbrite.com")) {
    return scrapeEventbrite(html, source, organizationId, shouldFilter);
  } else if (url.includes("miamidade.gov")) {
    return scrapeMiamiDadeGov(html, source, organizationId, shouldFilter);
  } else if (url.includes("mdpls.org")) {
    return scrapeMiamiLibrary(html, source, organizationId, shouldFilter);
  } else if (url.includes("miamichildrensmuseum.org")) {
    return scrapeChildrensMuseum(html, source, organizationId, shouldFilter);
  }

  // Generic fallback for all other sources
  return scrapeGenericEvents(html, source, organizationId, shouldFilter);
}

// Custom selector-based scraping for configured sources
function scrapeWithCustomSelectors(
  html: string,
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  try {
    const config = source.scraping_config!;
    const containerPattern = new RegExp(
      `<(?:div|article|li|section)[^>]*class="[^"]*${escapeRegex(config.selector!)}[^"]*"[^>]*>([\\s\\S]*?)<\/(?:div|article|li|section)>`,
      "gi"
    );

    let match;
    while ((match = containerPattern.exec(html)) !== null) {
      const eventHtml = match[1];

      // Extract using configured selectors or fallbacks
      const title = config.title_selector
        ? extractText(eventHtml, new RegExp(config.title_selector, "i"))
        : extractText(eventHtml, /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
          extractText(eventHtml, /<strong[^>]*>([^<]+)<\/strong>/i);

      const date = config.date_selector
        ? extractText(eventHtml, new RegExp(config.date_selector, "i"))
        : extractText(eventHtml, /<time[^>]*datetime="([^"]+)"/i) ||
          extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i);

      const location = config.location_selector
        ? extractText(eventHtml, new RegExp(config.location_selector, "i"))
        : extractText(eventHtml, /<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i);

      const link = config.link_selector
        ? extractAttribute(eventHtml, new RegExp(config.link_selector, "i"))
        : extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*>/i);

      if (title && title.length > 3) {
        const { isRelevant, matchedKeywords, score } = calculateRelevance(
          title,
          "",
          source.keywords,
          shouldFilter
        );

        if (isRelevant) {
          events.push({
            title: cleanText(title),
            description: "",
            date_start: date ? parseDate(date) : new Date().toISOString(),
            location: location ? cleanText(location) : source.location.city,
            url: link ? makeAbsoluteUrl(link, source.url) : source.url,
            source_name: source.name,
            source_id: source.id,
            keywords_matched: matchedKeywords,
            relevance_score: score,
            metadata: { method: 'custom_selectors' },
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Custom selector scraping failed for ${source.name}:`, error);
    // Fall back to generic scraping
    return scrapeGenericEvents(html, source, organizationId, shouldFilter);
  }

  return events;
}

// CORS proxy fallbacks
async function scrapeWithCorsProxies(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): Promise<ScrapedEvent[]> {

  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`,
    `https://corsproxy.io/?${encodeURIComponent(source.url)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        let html: string;

        if (contentType?.includes("application/json")) {
          const data = await response.json();
          html = data.contents || data.body || "";
        } else {
          html = await response.text();
        }

        if (html && html.length > 100) {
          const events = parseEventsBySource(html, source, organizationId, shouldFilter);
          if (events.length > 0) {
            return events;
          }
        }
      }
    } catch (error) {
      console.warn(`Proxy ${proxyUrl.substring(0, 40)}... failed`);
      continue;
    }
  }

  return [];
}

// Hybrid scraping with intelligent method selection and optimized fallbacks
async function scrapeWithHybridApproach(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): Promise<{ success: boolean; events: ScrapedEvent[]; error?: string; method?: string }> {

  // Optimized method order - prioritize faster methods first
  const methods = [
    { name: 'cache', fn: () => scrapeFromCache(source, organizationId, shouldFilter), timeout: 2000 },
    { name: 'basic', fn: () => scrapeBasicHTML(source, organizationId, shouldFilter), timeout: 5000 },
    { name: 'proxy', fn: () => scrapeWithProxy(source, organizationId, shouldFilter), timeout: 8000 },
    // Skip Browserless for now due to API issues - can be re-enabled later
    // { name: 'browserless', fn: () => scrapeWithBrowserless(source, organizationId, shouldFilter), timeout: 15000 },
  ];

  for (const method of methods) {
    try {
      console.log(`🔄 Trying ${method.name} scraping for ${source.name}`);

      // Add timeout to prevent hanging
      const result = await Promise.race([
        method.fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${method.name} timeout after ${method.timeout}ms`)), method.timeout)
        )
      ]);

      if (result.success && result.events.length > 0) {
        console.log(`✅ ${method.name} scraping successful for ${source.name}: ${result.events.length} events`);

        // Cache successful results
        await cacheScrapingResult(source.id, result.events, method.name);

        // Update performance metrics
        await updateScrapingMetrics(source.id, {
          last_success: true,
          events_found: result.events.length,
          last_error: null,
          last_attempt: new Date().toISOString(),
        });

        return { success: true, events: result.events, method: method.name };
      }
    } catch (error) {
      console.warn(`⚠️ ${method.name} scraping failed for ${source.name}:`, error instanceof Error ? error.message : String(error));
      continue;
    }
  }

  return {
    success: false,
    events: [],
    error: 'All scraping methods failed',
  };
}

// Cache-based scraping (fastest)
async function scrapeFromCache(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): Promise<{ success: boolean; events: ScrapedEvent[] }> {

  // Check if we have recent cached results
  const cacheKey = `scrape_${source.id}_${organizationId}`;
  const cached = await getCachedResult(cacheKey);

  if (cached && isCacheValid(cached.timestamp)) {
    console.log(`📋 Using cached results for ${source.name}`);
    return { success: true, events: cached.events };
  }

  return { success: false, events: [] };
}

// Basic HTML scraping (fast, works for simple sites)
async function scrapeBasicHTML(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): Promise<{ success: boolean; events: ScrapedEvent[] }> {

  // Try different user agents if the first one fails
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0"
  ];

  for (const userAgent of userAgents) {
    try {
      console.log(`🌐 Trying User-Agent for ${source.name}: ${userAgent.substring(0, 50)}...`);

      const response = await fetch(source.url, {
        headers: {
          "User-Agent": userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.log(`🚫 ${source.name} blocked request (403), trying different User-Agent`);
          continue; // Try next user agent
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Check if this site likely needs JavaScript
      if (needsJavaScript(html)) {
        console.log(`🤖 ${source.name} appears to need JavaScript, skipping basic HTML`);
        return { success: false, events: [] };
      }

      // Route to specific scrapers based on URL
      let events: ScrapedEvent[] = [];
      if (source.url.includes("eventbrite.com")) {
        events = scrapeEventbrite(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("miamidade.gov")) {
        events = scrapeMiamiDadeGov(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("mdpls.org")) {
        events = scrapeMiamiLibrary(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("miamichildrensmuseum.org")) {
        events = scrapeChildrensMuseum(html, source, organizationId, shouldFilter);
      } else {
        events = scrapeGenericEvents(html, source, organizationId, shouldFilter);
      }

      return { success: true, events };
    } catch (error) {
      console.error(`Basic HTML scraping failed for ${source.name}:`, error);
      continue; // Try next user agent instead of returning
    }
  }

  // If all user agents failed
  return { success: false, events: [] };
}

// Browserless.io API scraping (handles JavaScript) - Try BrowserQL first, fallback to REST API
async function scrapeWithBrowserless(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): Promise<{ success: boolean; events: ScrapedEvent[] }> {

  const browserlessApiKey = Deno.env.get("BROWSERLESS_API_KEY");
  const browserlessEndpoint = Deno.env.get("BROWSERLESS_ENDPOINT") || "https://chrome.browserless.io";

  if (!browserlessApiKey || browserlessApiKey === "your_browserless_api_key_here") {
    console.log("Browserless API key not configured, skipping browserless method");
    return { success: false, events: [] };
  }

  // Try BrowserQL first (more reliable)
  try {
    console.log(`🔍 Trying BrowserQL for ${source.name}`);
    const events = await scrapeWithBrowserQL(source, organizationId, shouldFilter, browserlessApiKey);
    if (events.length > 0) {
      return { success: true, events };
    }
  } catch (error) {
    console.error(`BrowserQL failed for ${source.name}, trying REST API:`, error instanceof Error ? error.message : String(error));
  }

  // Fallback to REST API
  try {
    console.log(`🔄 Falling back to Browserless REST API for ${source.name}`);
    const events = await scrapeWithBrowserlessREST(source, organizationId, shouldFilter, browserlessApiKey, browserlessEndpoint);
    return { success: true, events };
  } catch (error) {
    console.error(`Browserless REST API also failed for ${source.name}:`, error);
    return { success: false, events: [] };
  }
}

// BrowserQL scraping (GraphQL-based, more reliable)
async function scrapeWithBrowserQL(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean,
  apiKey: string
): Promise<ScrapedEvent[]> {

  // BrowserQL uses the same endpoint as REST API but with GraphQL queries
  const endpoint = "https://chrome.browserless.io";

  // Correct BrowserQL queries based on documentation
  const queries = [
    // Basic navigation and HTML extraction
    `
      query {
        goto(url: "${source.url}") {
          status
        }
        html {
          content
        }
      }
    `,
    // With wait for network idle
    `
      query {
        goto(url: "${source.url}", waitUntil: "networkidle2") {
          status
        }
        html {
          content
        }
      }
    `,
    // With explicit wait for body element
    `
      query {
        goto(url: "${source.url}") {
          status
        }
        waitForSelector(selector: "body", timeout: 10000) {
          text
        }
        html {
          content
        }
      }
    `,
    // With JavaScript evaluation for dynamic content
    `
      query {
        goto(url: "${source.url}") {
          status
        }
        evaluate(expression: "document.readyState") {
          result
        }
        waitForFunction(function: "document.readyState === 'complete'", timeout: 10000) {
          result
        }
        html {
          content
        }
      }
    `
  ];

  for (const query of queries) {
    try {
      console.log(`🔍 Trying BrowserQL query`);

      const response = await fetch(`${endpoint}/bql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: query
        }),
      });

      if (!response.ok) {
        console.warn(`BrowserQL query failed with status ${response.status}, trying next query...`);
        continue;
      }

      const result = await response.json();

      if (result.errors) {
        console.warn(`BrowserQL query errors: ${JSON.stringify(result.errors)}, trying next query...`);
        continue;
      }

      const html = result.data?.html?.content;
      if (!html || html.length < 100) {
        console.warn("No or insufficient HTML content received from BrowserQL, trying next query...");
        continue;
      }

      console.log(`✅ BrowserQL successful - received ${html.length} characters of HTML`);

      // Route to specific scrapers based on URL
      let events: ScrapedEvent[] = [];
      if (source.url.includes("eventbrite.com")) {
        events = scrapeEventbrite(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("miamidade.gov")) {
        events = scrapeMiamiDadeGov(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("mdpls.org")) {
        events = scrapeMiamiLibrary(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("miamichildrensmuseum.org")) {
        events = scrapeChildrensMuseum(html, source, organizationId, shouldFilter);
      } else {
        events = scrapeGenericEvents(html, source, organizationId, shouldFilter);
      }

      return events;

    } catch (error) {
      console.warn(`BrowserQL attempt failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
  }

  throw new Error("All BrowserQL attempts failed");
}

// Browserless REST API scraping (fallback)
async function scrapeWithBrowserlessREST(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean,
  apiKey: string,
  endpoint: string
): Promise<ScrapedEvent[]> {

  const browserlessResponse = await fetch(`${endpoint}/content?token=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      url: source.url,
      waitFor: 3000, // Wait 3 seconds for JavaScript to load
      gotoOptions: {
        waitUntil: 'networkidle2',
      },
      rejectRequestPattern: [
        '*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.ico',
        '*.css', '*.woff', '*.woff2', '*.ttf', '*.eot'
      ]
    }),
  });

  if (!browserlessResponse.ok) {
    throw new Error(`Browserless REST API error: ${browserlessResponse.status}`);
  }

  const html = await browserlessResponse.text();

  // Route to specific scrapers based on URL
  let events: ScrapedEvent[] = [];
  if (source.url.includes("eventbrite.com")) {
    events = scrapeEventbrite(html, source, organizationId, shouldFilter);
  } else if (source.url.includes("miamidade.gov")) {
    events = scrapeMiamiDadeGov(html, source, organizationId, shouldFilter);
  } else if (source.url.includes("mdpls.org")) {
    events = scrapeMiamiLibrary(html, source, organizationId, shouldFilter);
  } else if (source.url.includes("miamichildrensmuseum.org")) {
    events = scrapeChildrensMuseum(html, source, organizationId, shouldFilter);
  } else {
    events = scrapeGenericEvents(html, source, organizationId, shouldFilter);
  }

  return events;
}

// Proxy-based scraping (last resort fallback)
async function scrapeWithProxy(
  source: EventSource,
  organizationId: string,
  shouldFilter: boolean
): Promise<{ success: boolean; events: ScrapedEvent[] }> {

  // Try different proxy services as final fallback
  const proxyServices = [
    // CORS proxy services that might work
    `https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`,
    `https://cors-anywhere.herokuapp.com/${source.url}`,
    // Direct fetch with different headers (already tried in basic HTML)
  ];

  for (const proxyUrl of proxyServices) {
    try {
      console.log(`🔄 Trying proxy service for ${source.name}`);

      const response = await fetch(proxyUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        console.warn(`Proxy ${proxyUrl} returned ${response.status}, trying next...`);
        continue;
      }

      let html: string;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        // Handle JSON response from allorigins
        const data = await response.json();
        html = data.contents || "";
      } else {
        html = await response.text();
      }

      if (!html || html.length < 100) {
        console.warn("Proxy returned insufficient content, trying next...");
        continue;
      }

      console.log(`✅ Proxy successful, processing HTML for ${source.name}`);

      // Route to specific scrapers based on URL
      let events: ScrapedEvent[] = [];
      if (source.url.includes("eventbrite.com")) {
        events = scrapeEventbrite(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("miamidade.gov")) {
        events = scrapeMiamiDadeGov(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("mdpls.org")) {
        events = scrapeMiamiLibrary(html, source, organizationId, shouldFilter);
      } else if (source.url.includes("miamichildrensmuseum.org")) {
        events = scrapeChildrensMuseum(html, source, organizationId, shouldFilter);
      } else {
        events = scrapeGenericEvents(html, source, organizationId, shouldFilter);
      }

      return { success: true, events };

    } catch (error) {
      console.warn(`Proxy attempt failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
  }

  console.log(`❌ All proxy services failed for ${source.name}`);
  return { success: false, events: [] };
}

// Specific scrapers for major sites
function scrapeEventbrite(
  html: string,
  source: EventSource,
  orgId: string,
  shouldFilter: boolean = true
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  
  console.log(`🔍 DEBUG: Eventbrite parsing - HTML length: ${html.length}, first 200 chars: ${html.substring(0, 200)}`);

  // Multiple patterns for Eventbrite - more aggressive extraction with updated selectors
  const patterns = [
    // Updated Eventbrite selectors (2024)
    /<div[^>]*class="[^"]*event-card[^"]*[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*event-item[^"]*[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*data-testid="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<article[^>]*data-testid="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
    /<li[^>]*class="[^"]*event-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
    /<section[^>]*class="[^"]*event-list[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
    // Legacy patterns
    /<article[^>]*data-event-id="([^"]*)"[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*search-event-card[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<li[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const eventHtml = match[2] || match[1];
      const eventId = match[1] || extractAttribute(eventHtml, /data-event-id="([^"]+)"/i) || extractAttribute(eventHtml, /data-testid="([^"]+)"/i);

      // More flexible title selectors for 2024 Eventbrite
      let title = extractText(eventHtml, /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                  extractText(eventHtml, /<a[^>]*title="([^"]+)"[^>]*>/i) ||
                  extractText(eventHtml, /<a[^>]*>([^<]+)<\/a>/i) ||
                  extractText(eventHtml, /<strong[^>]*>([^<]+)<\/strong>/i) ||
                  extractText(eventHtml, /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                  // Eventbrite 2024 specific selectors
                  extractText(eventHtml, /<span[^>]*data-testid="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                  extractText(eventHtml, /<div[^>]*data-testid="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i);

      // Enhanced date selectors
      let date = extractText(eventHtml, /<time[^>]*datetime="([^"]+)"/i) ||
                 extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i) ||
                 extractText(eventHtml, /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                 extractText(eventHtml, /<div[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                 // Eventbrite 2024 specific
                 extractText(eventHtml, /<span[^>]*data-testid="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                 extractText(eventHtml, /<span[^>]*aria-label="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i);

      // Enhanced location selectors
      let location = extractText(eventHtml, /<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     extractText(eventHtml, /<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                     extractText(eventHtml, /<address[^>]*>([^<]+)<\/address>/i) ||
                     // Eventbrite 2024 specific
                     extractText(eventHtml, /<span[^>]*data-testid="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     extractText(eventHtml, /<span[^>]*aria-label="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i);

      // Enhanced link selectors
      let link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*>/i) ||
                 extractAttribute(eventHtml, /<a[^>]*title="[^"]*event[^"]*"[^>]*>/i) ||
                 // Eventbrite 2024 specific
                 extractAttribute(eventHtml, /<a[^>]*data-testid="[^"]*event[^"]*"[^>]*>/i) ||
                 extractAttribute(eventHtml, /href="([^"]*event[^"]*)"/i);

      // Multiple description selectors
      let description = extractText(eventHtml, /<p[^>]*class="[^"]*event-card__description[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                        extractText(eventHtml, /<div[^>]*class="[^"]*event-description[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                        extractText(eventHtml, /<span[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/span>/i);

      if (title) {
        const { isRelevant, matchedKeywords, score } = calculateRelevance(
          title,
          description || "",
          source.keywords,
          shouldFilter
        );

        if (isRelevant) {
          events.push({
            title: cleanText(title),
            description: description ? cleanText(description) : "",
            date_start: date ? parseDate(date) : new Date().toISOString(),
            location: location ? cleanText(location) : source.location.city,
            url: link ? (link.startsWith("http") ? link : `https://www.eventbrite.com${link}`) : source.url,
            source_name: source.name,
            source_id: source.id,
            keywords_matched: matchedKeywords,
            relevance_score: score,
            metadata: { event_id: eventId, scraping_method: 'eventbrite_enhanced' },
          });
        }
      }
    }
  }

  return events;
}

function scrapeMiamiDadeGov(
  html: string,
  source: EventSource,
  orgId: string,
  shouldFilter: boolean = true
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  console.log(`🔍 DEBUG: Miami-Dade parsing - HTML length: ${html.length}, first 300 chars: ${html.substring(0, 300)}`);

  // Enhanced patterns for Miami-Dade government sites (2024 updates)
  const patterns = [
    // More comprehensive event container patterns
    /<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<article[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
    /<li[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
    /<tr[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi,
    /<section[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
    
    // Government-specific patterns
    /<div[^>]*class="[^"]*activity[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*program[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*calendar[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*listing[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    
    // Table-based events (common in government sites)
    /<tr[^>]*>([\s\S]*?)<\/tr>/gi, // Generic table rows - will filter later
    /<td[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/td>/gi,
    /<td[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/td>/gi,
    
    // Content block patterns
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const eventHtml = match[1];

      // Ultra-aggressive title extraction for government sites
      let title = extractText(eventHtml, /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                  extractText(eventHtml, /<strong[^>]*>([^<]+)<\/strong>/i) ||
                  extractText(eventHtml, /<b[^>]*>([^<]+)<\/b>/i) ||
                  extractText(eventHtml, /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                  extractText(eventHtml, /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                  extractText(eventHtml, /<a[^>]*class="[^"]*event[^"]*"[^>]*title="([^"]+)"/i) ||
                  extractText(eventHtml, /<a[^>]*title="([^"]+)"[^>]*class="[^"]*event[^"]*"/i) ||
                  // Government-specific selectors
                  extractText(eventHtml, /<a[^>]*title="([^"]+)"[^>]*>/i) ||
                  extractText(eventHtml, /<a[^>]*>([^<]+)<\/a>/i) ||
                  extractText(eventHtml, /<p[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                  // Meta/structured data
                  extractText(eventHtml, /<meta[^>]*property="[^"]*title[^"]*"[^>]*content="([^"]+)"/i) ||
                  // Generic content that might be titles
                  extractText(eventHtml, /<[^>]*>([^<]{10,80})<\/[^>]*>/i);

      // If still no title, try extracting from table cells or generic content
      if (!title) {
        const textContent = eventHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (textContent.length > 10 && textContent.length < 100) {
          title = textContent.split('.')[0] || textContent.split('!')[0] || textContent;
        }
      }

      // Ultra-aggressive date extraction for government sites
      let date = extractText(eventHtml, /<time[^>]*datetime="([^"]+)"/i) ||
                 extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i) ||
                 extractText(eventHtml, /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                 extractText(eventHtml, /<div[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                 extractText(eventHtml, /<td[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/td>/i) ||
                 extractText(eventHtml, /<p[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                 // Government-specific date patterns
                 extractText(eventHtml, /<span[^>]*title="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                 extractText(eventHtml, /<div[^>]*title="[^"]*date[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                 // Flexible date patterns
                 extractText(eventHtml, /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i) ||
                 extractText(eventHtml, /\b\d{1,2}\/\d{1,2}\/\d{4}\b/i) ||
                 extractText(eventHtml, /\b\d{4}-\d{2}-\d{2}\b/i) ||
                 // Date in text
                 extractText(eventHtml, /date[^:]*:?\s*([^<\n]+)/i);

      // Ultra-aggressive location extraction for government sites
      let location = extractText(eventHtml, /<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     extractText(eventHtml, /<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                     extractText(eventHtml, /<address[^>]*>([^<]+)<\/address>/i) ||
                     extractText(eventHtml, /<td[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/td>/i) ||
                     extractText(eventHtml, /<p[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                     // Government-specific location patterns
                     extractText(eventHtml, /<span[^>]*title="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     extractText(eventHtml, /\b(?:Miami|Flordia|FL|County|Park|Center|Library|Museum|Hall)\b[^<\n]*/i) ||
                     // Location in text
                     extractText(eventHtml, /location[^:]*:?\s*([^<\n]+)/i);

      // Ultra-aggressive description extraction for government sites
      let description = extractText(eventHtml, /<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                        extractText(eventHtml, /<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                        extractText(eventHtml, /<span[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                        extractText(eventHtml, /<td[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/td>/i) ||
                        extractText(eventHtml, /<p[^>]*>([^<]{20,200})<\/p>/i) || // Any paragraph with reasonable content
                        // Summary/excerpt patterns
                        extractText(eventHtml, /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                        extractText(eventHtml, /<div[^>]*class="[^"]*excerpt[^"]*"[^>]*>([^<]+)<\/div>/i);

      // Ultra-aggressive link extraction for government sites
      let link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*class="[^"]*event[^"]*"/i) ||
                 extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*title="[^"]*event[^"]*"/i) ||
                 extractAttribute(eventHtml, /href="([^"]*event[^"]*)"/i) ||
                 extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"/i) ||
                 // Government-specific link patterns
                 extractAttribute(eventHtml, /<a[^>]*title="([^"]+)"[^>]*>/i) ||
                 extractAttribute(eventHtml, /<a[^>]*data-url="([^"]+)"/i);

      if (title) {
        const { isRelevant, matchedKeywords, score } = calculateRelevance(
          title,
          description || "",
          source.keywords,
          shouldFilter
        );

        if (isRelevant) {
          events.push({
            title: cleanText(title),
            description: description ? cleanText(description) : "",
            date_start: date ? parseDate(date) : new Date().toISOString(),
            location: location ? cleanText(location) : "Miami-Dade County",
            url: link ? makeAbsoluteUrl(link, source.url) : source.url,
            source_name: source.name,
            source_id: source.id,
            keywords_matched: matchedKeywords,
            relevance_score: score,
            metadata: { scraping_method: 'miami_dade_aggressive' },
          });
        }
      }
    }
  }

  return events;
}

function scrapeMiamiLibrary(
  html: string,
  source: EventSource,
  orgId: string,
  shouldFilter: boolean = true
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  console.log(`🔍 DEBUG: Miami Library parsing - HTML length: ${html.length}, first 300 chars: ${html.substring(0, 300)}`);

  // Enhanced MDPLS patterns (Miami-Dade Public Library System)
  const patterns = [
    // MDPLS Drupal patterns
    /<div[^>]*class="[^"]*views-row[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*views-field[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<article[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
    
    // Library-specific patterns
    /<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<li[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
    /<div[^>]*class="[^"]*program[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*class[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*activity[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    
    // Content blocks
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/section>/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const eventHtml = match[1];

      // Enhanced title extraction for library sites
      let title = extractText(eventHtml, /<h[1-6][^>]*class="[^"]*field-content[^"]*"[^>]*>([^<]+)<\/h[1-6]>/i) ||
                  extractText(eventHtml, /<h[2-3][^>]*>([^<]+)<\/h[2-3]>/i) ||
                  extractText(eventHtml, /<a[^>]*title="([^"]+)"[^>]*>/i) ||
                  extractText(eventHtml, /<a[^>]*>([^<]+)<\/a>/i) ||
                  extractText(eventHtml, /<strong[^>]*>([^<]+)<\/strong>/i) ||
                  // Library-specific selectors
                  extractText(eventHtml, /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                  extractText(eventHtml, /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i);

      // Enhanced date extraction for library sites
      let date = extractText(eventHtml, /<span[^>]*class="[^"]*date-display-single[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                 extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i) ||
                 extractText(eventHtml, /<time[^>]*datetime="([^"]+)"/i) ||
                 extractText(eventHtml, /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                 extractText(eventHtml, /<div[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                 // Library-specific date patterns
                 extractText(eventHtml, /<p[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/p>/i);

      // Enhanced location extraction for library sites
      let location = extractText(eventHtml, /<div[^>]*class="[^"]*field-name-field-location[^"]*"[^>]*>([^<]+)</i) ||
                     extractText(eventHtml, /<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)</i) ||
                     extractText(eventHtml, /<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     extractText(eventHtml, /<p[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                     // Library branches
                     extractText(eventHtml, /\b(?:Main|Branch|Library|Coral Gables|Downtown|Biscayne|Kendall|West Dade|South Miami)\b[^<\n]*/i);

      // Enhanced link extraction for library sites
      let link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*>/i) ||
                 extractAttribute(eventHtml, /<a[^>]*title="[^"]*event[^"]*"[^>]*>/i) ||
                 extractAttribute(eventHtml, /<a[^>]*class="[^"]*event[^"]*"[^>]*>/i);

      if (title && title.length > 3) {
        const { isRelevant, matchedKeywords, score } = calculateRelevance(
          title,
          "",
          source.keywords,
          shouldFilter
        );

        if (isRelevant) {
          events.push({
            title: cleanText(title),
            description: "",
            date_start: date ? parseDate(date) : new Date().toISOString(),
            location: location ? cleanText(location) : "Miami-Dade Library",
            url: link ? makeAbsoluteUrl(link, source.url) : source.url,
            source_name: source.name,
            source_id: source.id,
            keywords_matched: matchedKeywords,
            relevance_score: score,
            metadata: { scraping_method: 'miami_library_enhanced' },
          });
        }
      }
    }
  }

  return events;
}

function scrapeChildrensMuseum(
  html: string,
  source: EventSource,
  orgId: string,
  shouldFilter: boolean = true
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  // Children's Museum specific patterns - focus on sensory events
  const patterns = [
    /<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<article[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const eventHtml = match[1];

      const title = extractText(eventHtml, /<h[23][^>]*>([^<]+)<\/h[23]>/i) ||
                    extractText(eventHtml, /<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</i);

      const date = extractText(eventHtml, /<[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)</i) ||
                  extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i);

      const description = extractText(eventHtml, /<p[^>]*>([^<]+)<\/p>/i);
      const link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"/i);

      // Only include sensory/autism focused events
      if (title && (title.toLowerCase().includes('sensory') || title.toLowerCase().includes('autism') ||
          description?.toLowerCase().includes('sensory') || title.toLowerCase().includes('saturday'))) {
        const { isRelevant, matchedKeywords, score } = calculateRelevance(
          title,
          description || "",
          source.keywords
        );

        if (isRelevant) {
          events.push({
            title: cleanText(title),
            description: description ? cleanText(description) : "",
            date_start: date ? parseDate(date) : new Date().toISOString(),
            location: "Miami Children's Museum",
            url: link ? makeAbsoluteUrl(link, source.url) : source.url,
            source_name: source.name,
            source_id: source.id,
            keywords_matched: matchedKeywords,
            relevance_score: score,
            metadata: { sensory_focused: true },
          });
        }
      }
    }
  }

  return events;
}

function scrapeGenericEvents(
  html: string,
  source: EventSource,
  orgId: string,
  shouldFilter: boolean = true
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  // Ultra-aggressive patterns for any website - comprehensive event extraction
  const aggressivePatterns = [
    // Standard event containers
    /<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<article[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
    /<li[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
    /<section[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,

    // Activity/program containers
    /<div[^>]*class="[^"]*activity[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*program[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*workshop[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*class[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,

    // Calendar/schedule containers
    /<div[^>]*class="[^"]*calendar[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*schedule[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<tr[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi,
    /<td[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/td>/gi,

    // Card/listing containers
    /<div[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*listing[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,

    // Generic content blocks that might contain events
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  ];

  // Also try the configured selectors if available
  if (source.scraping_config?.selector) {
    const configSelectors = source.scraping_config.selector.split(",").map((s) => s.trim());
    for (const selector of configSelectors) {
      const pattern = new RegExp(
        `<(?:div|article|li|section)[^>]*class="[^"]*${escapeRegex(selector.replace(/[.\[\]]/g, ""))}[^"]*"[^>]*>([\\s\\S]*?)<\/(?:div|article|li|section)>`,
        "gi"
      );
      aggressivePatterns.push(pattern);
    }
  }

  for (const pattern of aggressivePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const eventHtml = match[1];

      // Ultra-aggressive title extraction - try every possible method
      let title = extractText(eventHtml, /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                  extractText(eventHtml, /<strong[^>]*>([^<]+)<\/strong>/i) ||
                  extractText(eventHtml, /<b[^>]*>([^<]+)<\/b>/i) ||
                  extractText(eventHtml, /<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                  extractText(eventHtml, /<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                  extractText(eventHtml, /<a[^>]*title="([^"]+)"[^>]*>/i) ||
                  extractText(eventHtml, /<a[^>]*class="[^"]*event[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                  extractText(eventHtml, /<p[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/p>/i);

      // If no title found, try even more aggressive methods
      if (!title) {
        // Look for any text that might be a title (first few words of content)
        const textContent = eventHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (textContent.length > 10 && textContent.length < 100) {
          title = textContent.split('.')[0] || textContent.split('!')[0] || textContent;
        }
      }

      // Ultra-aggressive date extraction
      let date = extractText(eventHtml, /<time[^>]*datetime="([^"]+)"/i) ||
                 extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i) ||
                 extractText(eventHtml, /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                 extractText(eventHtml, /<div[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                 extractText(eventHtml, /<p[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                 extractText(eventHtml, /<td[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/td>/i) ||
                 extractText(eventHtml, /<strong[^>]*>date[^:]*:?\s*([^<]+)<\/strong>/i) ||
                 extractText(eventHtml, /date[^:]*:?\s*([^<\n]+)/i);

      // Ultra-aggressive location extraction
      let location = extractText(eventHtml, /<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     extractText(eventHtml, /<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                     extractText(eventHtml, /<address[^>]*>([^<]+)<\/address>/i) ||
                     extractText(eventHtml, /<p[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                     extractText(eventHtml, /<td[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/td>/i) ||
                     extractText(eventHtml, /<strong[^>]*>location[^:]*:?\s*([^<]+)<\/strong>/i) ||
                     extractText(eventHtml, /location[^:]*:?\s*([^<\n]+)/i);

      // Ultra-aggressive description extraction
      let description = extractText(eventHtml, /<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                        extractText(eventHtml, /<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/div>/i) ||
                        extractText(eventHtml, /<span[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                        extractText(eventHtml, /<td[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/td>/i) ||
                        extractText(eventHtml, /<p[^>]*>([^<]{20,200})<\/p>/i); // Any paragraph with reasonable content length

      // Ultra-aggressive link extraction
      let link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*class="[^"]*event[^"]*"/i) ||
                 extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*title="[^"]*event[^"]*"/i) ||
                 extractAttribute(eventHtml, /href="([^"]*event[^"]*)"/i) ||
                 extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*>/i);

      // Only create event if we have at least a title
      if (title && title.length > 3) {
        const { isRelevant, matchedKeywords, score } = calculateRelevance(
          title,
          description || "",
          source.keywords,
          shouldFilter
        );

        if (isRelevant) {
          events.push({
            title: cleanText(title),
            description: description ? cleanText(description) : "",
            date_start: date ? parseDate(date) : new Date().toISOString(),
            location: location ? cleanText(location) : source.location.city,
            url: link ? makeAbsoluteUrl(link, source.url) : source.url,
            source_name: source.name,
            source_id: source.id,
            keywords_matched: matchedKeywords,
            relevance_score: score,
            metadata: { scraping_method: 'generic_ultra_aggressive' },
          });
        }
      }
    }
  }

  return events;
}

// Utility functions
function calculateRelevance(
  title: string,
  description: string,
  keywords: string[],
  shouldFilter: boolean = true
): { isRelevant: boolean; matchedKeywords: string[]; score: number } {
  // If filtering is disabled, accept all events
  if (!shouldFilter) {
    return {
      isRelevant: true,
      matchedKeywords: [],
      score: 100
    };
  }

  // If filtering is enabled, check for accessibility keywords
  const text = `${title} ${description}`.toLowerCase();
  const accessibilityKeywords = [
    'sensory-friendly', 'sensory', 'adaptive', 'inclusive',
    'autism-friendly', 'disabilities-accessible', 'autism',
    'special needs', 'accessible', 'disabilities',
    'family', 'kids', 'children', 'child', 'parent',
    'workshop', 'class', 'program', 'activity', 'event',
    'community', 'free', 'open', 'public', 'education'
  ];

  const matchedKeywords: string[] = [];
  let score = 0;

  for (const keyword of accessibilityKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      score += 15; // Each match adds 15 points
    }
  }

  // Also check source-specific keywords
  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      score += 8; // Source keywords add 8 points each
    }
  }

  // Boost score for longer, more descriptive titles
  if (title && title.length > 15) {
    score += 5;
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // More flexible matching: accept events with score >= 15 or any title
  const isRelevant = score >= 15 || (title && title.length > 10);

  return {
    isRelevant: Boolean(isRelevant),
    matchedKeywords,
    score
  };
}

function extractText(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match ? match[1].trim() : "";
}

function extractAttribute(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match ? match[1].trim() : "";
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(dateStr: string): string {
  try {
    dateStr = cleanText(dateStr);

    const now = new Date();
    const currentYear = now.getFullYear();

    const patterns = [
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\w+)\s+(\d{1,2})/i,
      /(\d{1,2})\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
    }

    const monthMatch = dateStr.match(/(\w+)/i);
    if (monthMatch) {
      const monthStr = monthMatch[1];
      const dayMatch = dateStr.match(/(\d{1,2})/);
      const day = dayMatch ? parseInt(dayMatch[1]) : 1;

      const testDate = new Date(`${monthStr} ${day}, ${currentYear}`);
      if (!isNaN(testDate.getTime())) {
        if (testDate < now) {
          testDate.setFullYear(currentYear + 1);
        }
        return testDate.toISOString();
      }
    }

    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return futureDate.toISOString();
  } catch (error) {
    console.error("Error parsing date:", dateStr, error);
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return futureDate.toISOString();
  }
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  try {
    const base = new URL(baseUrl);
    if (url.startsWith("/")) {
      return `${base.origin}${url}`;
    } else {
      return `${base.origin}/${url}`;
    }
  } catch {
    return url;
  }
}

// Caching utilities
async function getCachedResult(cacheKey: string): Promise<{ events: ScrapedEvent[]; timestamp: string } | null> {
  try {
    // Use Supabase as cache storage (could be optimized with Redis later)
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data, error } = await supabase
      .from('scraping_cache')
      .select('cached_data, created_at')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    return {
      events: JSON.parse(data.cached_data),
      timestamp: data.created_at
    };
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

async function cacheScrapingResult(sourceId: string, events: ScrapedEvent[], method: string): Promise<void> {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cacheKey = `scrape_${sourceId}_${new Date().toISOString().split('T')[0]}`; // Daily cache

    await supabase
      .from('scraping_cache')
      .upsert({
        cache_key: cacheKey,
        cached_data: JSON.stringify(events),
        method_used: method,
        events_count: events.length,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

function isCacheValid(timestamp: string): boolean {
  const cacheTime = new Date(timestamp);
  const now = new Date();
  const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);

  // Cache valid for 24 hours
  return hoursDiff < 24;
}

// JavaScript detection utility
function needsJavaScript(html: string): boolean {
  const indicators = [
    /<script[^>]*src=[^>]*>/gi,  // External scripts
    /window\./gi,                 // Browser APIs
    /document\./gi,              // DOM manipulation
    /react/gi, /vue/gi, /angular/gi, // Frameworks
    /<noscript>/gi,              // NoScript tags
    /javascript:void/gi,         // JavaScript links
    /onload=/gi, /onclick=/gi,   // Event handlers
  ];

  let indicatorCount = 0;
  for (const indicator of indicators) {
    if (indicator.test(html)) {
      indicatorCount++;
    }
  }

  // If we find multiple JavaScript indicators, likely needs JS
  return indicatorCount >= 2;
}

// Metrics update utility
async function updateScrapingMetrics(sourceId: string, metrics: any): Promise<void> {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    await supabase
      .from('event_sources')
      .update({
        performance_metrics: metrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId);
  } catch (error) {
    console.warn('Metrics update error:', error);
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
