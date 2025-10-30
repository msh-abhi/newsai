import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
  scraping_config: {
    selector: string;
    title_selector: string;
    date_selector: string;
    location_selector: string;
    link_selector?: string;
    description_selector?: string;
  };
  performance_metrics: {
    last_success?: boolean;
    events_found?: number;
    last_error?: string;
    last_attempt?: string;
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

    const { organization_id, source_ids, test_mode = false } = await req.json();

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    console.log(`🚀 Starting event scraping for org: ${organization_id}`);

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

    let totalEvents = 0;
    let successfulSources = 0;
    const scrapedEvents: ScrapedEvent[] = [];

    for (const source of sources) {
      try {
        console.log(`🔍 Scraping: ${source.name} (${source.url})`);

        const events = await scrapeEventSource(source as EventSource, organization_id);

        console.log(`✅ Found ${events.length} events from ${source.name}`);

        scrapedEvents.push(...events);
        totalEvents += events.length;
        successfulSources++;

        await supabase
          .from("event_sources")
          .update({
            last_scraped_at: new Date().toISOString(),
            performance_metrics: {
              last_success: true,
              events_found: events.length,
              last_error: null,
              last_attempt: new Date().toISOString(),
            },
          })
          .eq("id", source.id);
      } catch (error) {
        console.error(`❌ Error scraping ${source.name}:`, error.message);

        await supabase
          .from("event_sources")
          .update({
            performance_metrics: {
              last_success: false,
              events_found: 0,
              last_error: error.message,
              last_attempt: new Date().toISOString(),
            },
          })
          .eq("id", source.id);
      }
    }

    if (!test_mode && scrapedEvents.length > 0) {
      console.log(`💾 Saving ${scrapedEvents.length} events to database`);

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
        throw insertError;
      }
    }

    const responseData = {
      success: true,
      message: test_mode
        ? `Test mode: Found ${totalEvents} events from ${successfulSources}/${sources.length} sources`
        : `Successfully scraped ${totalEvents} events from ${successfulSources}/${sources.length} sources`,
      total_events: totalEvents,
      sources_processed: successfulSources,
      sources_failed: sources.length - successfulSources,
      events: test_mode ? scrapedEvents : undefined,
    };

    console.log("✨ Scraping complete:", responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("💥 Event scraper error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        total_events: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function scrapeEventSource(
  source: EventSource,
  organizationId: string
): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];

  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    if (source.url.includes("eventbrite.com")) {
      return scrapeEventbrite(html, source, organizationId);
    } else if (source.url.includes("miamidade.gov")) {
      return scrapeMiamiDadeGov(html, source, organizationId);
    } else if (source.url.includes("mdpls.org")) {
      return scrapeMiamiLibrary(html, source, organizationId);
    } else if (source.url.includes("thechildrenstrust.org")) {
      return scrapeChildrensTrust(html, source, organizationId);
    } else if (source.url.includes("miamichildrensmuseum.org")) {
      return scrapeChildrensMuseum(html, source, organizationId);
    } else if (source.url.includes("miami.gov")) {
      return scrapeCityOfMiami(html, source, organizationId);
    } else if (source.url.includes("miamibeachfl.gov")) {
      return scrapeMiamiBeach(html, source, organizationId);
    } else if (source.url.includes("coralgables.com")) {
      return scrapeCoralGables(html, source, organizationId);
    } else if (source.url.includes("card.miami.edu")) {
      return scrapeUMCard(html, source, organizationId);
    } else if (source.url.includes("miamionthecheap.com")) {
      return scrapeMiamiOnTheCheap(html, source, organizationId);
    } else if (source.url.includes("munchkinfun.com")) {
      return scrapeMunchkinFun(html, source, organizationId);
    } else if (source.url.includes("mommypoppins.com")) {
      return scrapeMommyPoppins(html, source, organizationId);
    } else if (source.url.includes("kidsoutandabout.com")) {
      return scrapeKidsOutAndAbout(html, source, organizationId);
    } else if (source.url.includes("miamidadearts.org")) {
      return scrapeAllKidsIncluded(html, source, organizationId);
    } else if (source.url.includes("arshtcenter.org")) {
      return scrapeArshtCenter(html, source, organizationId);
    } else if (source.url.includes("parentacademymiami.com")) {
      return scrapeParentAcademy(html, source, organizationId);
    } else {
      return scrapeGenericEvents(html, source, organizationId);
    }
  } catch (error) {
    console.error(`Error in scrapeEventSource for ${source.name}:`, error);
    throw error;
  }
}

function scrapeEventbrite(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  const eventPattern = /<article[^>]*data-event-id="([^"]*)"[^>]*>([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = eventPattern.exec(html)) !== null) {
    const eventHtml = match[2];

    const title = extractText(eventHtml, /<h[23][^>]*class="[^"]*event-card__title[^"]*"[^>]*>([^<]+)<\/h[23]>/i);
    const date = extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i);
    const location = extractText(eventHtml, /<p[^>]*class="[^"]*event-card__location[^"]*"[^>]*>([^<]+)<\/p>/i);
    const link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"[^>]*class="[^"]*event-card-link[^"]*"/i);
    const description = extractText(eventHtml, /<p[^>]*class="[^"]*event-card__description[^"]*"[^>]*>([^<]+)<\/p>/i);

    if (title && date) {
      const { isRelevant, matchedKeywords, score } = calculateRelevance(
        title,
        description || "",
        source.keywords
      );

      if (isRelevant) {
        events.push({
          title: cleanText(title),
          description: description ? cleanText(description) : "",
          date_start: parseDate(date),
          location: location ? cleanText(location) : source.location.city,
          url: link ? (link.startsWith("http") ? link : `https://www.eventbrite.com${link}`) : source.url,
          source_name: source.name,
          source_id: source.id,
          keywords_matched: matchedKeywords,
          relevance_score: score,
          metadata: { event_id: match[1] },
        });
      }
    }
  }

  return events;
}

function scrapeMiamiDadeGov(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  const eventPattern = /<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = eventPattern.exec(html)) !== null) {
    const eventHtml = match[1];

    const title = extractText(eventHtml, /<h[23][^>]*>([^<]+)<\/h[23]>/i) ||
                  extractText(eventHtml, /<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</i);
    const date = extractText(eventHtml, /<[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)</i);
    const location = extractText(eventHtml, /<[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)</i);
    const description = extractText(eventHtml, /<p[^>]*>([^<]+)<\/p>/i);
    const link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"/i);

    if (title && date) {
      const { isRelevant, matchedKeywords, score } = calculateRelevance(
        title,
        description || "",
        source.keywords
      );

      if (isRelevant) {
        events.push({
          title: cleanText(title),
          description: description ? cleanText(description) : "",
          date_start: parseDate(date),
          location: location ? cleanText(location) : "Miami-Dade County",
          url: link ? makeAbsoluteUrl(link, source.url) : source.url,
          source_name: source.name,
          source_id: source.id,
          keywords_matched: matchedKeywords,
          relevance_score: score,
          metadata: {},
        });
      }
    }
  }

  return events;
}

function scrapeMiamiLibrary(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  const eventPattern = /<div[^>]*class="[^"]*views-row[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = eventPattern.exec(html)) !== null) {
    const eventHtml = match[1];

    const title = extractText(eventHtml, /<h[23][^>]*class="[^"]*field-content[^"]*"[^>]*>([^<]+)<\/h[23]>/i) ||
                  extractText(eventHtml, /<a[^>]*>([^<]+)<\/a>/i);
    const date = extractText(eventHtml, /<span[^>]*class="[^"]*date-display-single[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                 extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i);
    const location = extractText(eventHtml, /<div[^>]*class="[^"]*field-name-field-location[^"]*"[^>]*>([^<]+)</i);
    const link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"/i);

    if (title) {
      const { isRelevant, matchedKeywords, score } = calculateRelevance(
        title,
        "",
        source.keywords
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
          metadata: {},
        });
      }
    }
  }

  return events;
}

function scrapeChildrensTrust(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeChildrensMuseum(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeCityOfMiami(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeMiamiBeach(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeCoralGables(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeUMCard(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeMiamiOnTheCheap(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeMunchkinFun(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeMommyPoppins(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeKidsOutAndAbout(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeAllKidsIncluded(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeArshtCenter(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeParentAcademy(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  return scrapeGenericEvents(html, source, orgId);
}

function scrapeGenericEvents(
  html: string,
  source: EventSource,
  orgId: string
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const config = source.scraping_config;

  const selectorVariations = config.selector.split(",").map((s) => s.trim());

  for (const selector of selectorVariations) {
    const pattern = new RegExp(
      `<(?:div|article|li)[^>]*class="[^"]*${escapeRegex(selector.replace(/[.\[\]]/g, ""))}[^"]*"[^>]*>([\\s\\S]*?)</(?:div|article|li)>`,
      "gi"
    );
    let match;

    while ((match = pattern.exec(html)) !== null) {
      const eventHtml = match[1];

      const titleSelectors = config.title_selector.split(",").map((s) => s.trim());
      const dateSelectors = config.date_selector.split(",").map((s) => s.trim());
      const locationSelectors = config.location_selector.split(",").map((s) => s.trim());

      let title = "";
      for (const sel of titleSelectors) {
        title = extractText(eventHtml, new RegExp(`<[^>]*class="[^"]*${escapeRegex(sel.replace(/[.\[\]]/g, ""))}[^"]*"[^>]*>([^<]+)`, "i"));
        if (title) break;
      }
      if (!title) {
        title = extractText(eventHtml, /<h[123][^>]*>([^<]+)<\/h[123]>/i);
      }

      let date = "";
      for (const sel of dateSelectors) {
        date = extractText(eventHtml, new RegExp(`<[^>]*class="[^"]*${escapeRegex(sel.replace(/[.\[\]]/g, ""))}[^"]*"[^>]*>([^<]+)`, "i"));
        if (date) break;
      }
      if (!date) {
        date = extractText(eventHtml, /<time[^>]*>([^<]+)<\/time>/i);
      }

      let location = "";
      for (const sel of locationSelectors) {
        location = extractText(eventHtml, new RegExp(`<[^>]*class="[^"]*${escapeRegex(sel.replace(/[.\[\]]/g, ""))}[^"]*"[^>]*>([^<]+)`, "i"));
        if (location) break;
      }

      const description = extractText(eventHtml, /<p[^>]*>([^<]+)<\/p>/i);
      const link = extractAttribute(eventHtml, /<a[^>]*href="([^"]+)"/i);

      if (title) {
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
            location: location ? cleanText(location) : source.location.city,
            url: link ? makeAbsoluteUrl(link, source.url) : source.url,
            source_name: source.name,
            source_id: source.id,
            keywords_matched: matchedKeywords,
            relevance_score: score,
            metadata: {},
          });
        }
      }
    }
  }

  return events;
}

function calculateRelevance(
  title: string,
  description: string,
  keywords: string[]
): { isRelevant: boolean; matchedKeywords: string[]; score: number } {
  const text = `${title} ${description}`.toLowerCase();
  const matchedKeywords: string[] = [];
  let score = 0;

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();

    if (text.includes(keywordLower)) {
      matchedKeywords.push(keyword);

      const titleMatch = title.toLowerCase().includes(keywordLower);
      if (titleMatch) {
        score += 30;
      } else {
        score += 15;
      }

      const exactMatch = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, "i").test(text);
      if (exactMatch) {
        score += 10;
      }
    }
  }

  score = Math.min(100, score);

  const isRelevant = matchedKeywords.length > 0 && score >= 20;

  return { isRelevant, matchedKeywords, score };
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
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
