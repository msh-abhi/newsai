import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`⏰ Starting scheduled daily event scraping at ${new Date().toISOString()}`);

    // Get all organizations that have active event sources
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true);

    if (orgError) throw orgError;

    if (!organizations || organizations.length === 0) {
      console.log('ℹ️ No active organizations found');
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active organizations found",
          organizations_processed: 0,
          total_events: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Found ${organizations.length} active organizations to process`);

    let totalOrganizations = 0;
    let totalEvents = 0;
    let successfulOrganizations = 0;
    const results = [];

    // Process each organization
    for (const org of organizations) {
      try {
        console.log(`🏢 Processing organization: ${org.name} (${org.id})`);

        // Check if organization has active event sources
        const { data: sources, error: sourcesError } = await supabase
          .from('event_sources')
          .select('id')
          .eq('organization_id', org.id)
          .eq('is_active', true)
          .limit(1);

        if (sourcesError) throw sourcesError;

        if (!sources || sources.length === 0) {
          console.log(`⏭️ Skipping ${org.name} - no active event sources`);
          continue;
        }

        // Trigger scraping for this organization
        const { data: scrapeResult, error: scrapeError } = await supabase.functions.invoke('event-scraper', {
          body: {
            organization_id: org.id,
            test_mode: false,
          },
        });

        if (scrapeError) throw scrapeError;

        console.log(`✅ Scraped ${scrapeResult.total_events} events for ${org.name}`);

        results.push({
          organization_id: org.id,
          organization_name: org.name,
          events_found: scrapeResult.total_events,
          sources_processed: scrapeResult.sources_processed,
          sources_failed: scrapeResult.sources_failed,
          success: scrapeResult.success,
        });

        totalOrganizations++;
        totalEvents += scrapeResult.total_events;

        if (scrapeResult.success) {
          successfulOrganizations++;
        }

        // Add small delay between organizations to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing organization ${org.name}:`, error.message);

        results.push({
          organization_id: org.id,
          organization_name: org.name,
          events_found: 0,
          sources_processed: 0,
          sources_failed: 0,
          success: false,
          error: error.message,
        });
      }
    }

    const summary = {
      success: true,
      message: `Scheduled scraping completed: ${totalEvents} events from ${successfulOrganizations}/${totalOrganizations} organizations`,
      timestamp: new Date().toISOString(),
      organizations_processed: totalOrganizations,
      successful_organizations: successfulOrganizations,
      total_events: totalEvents,
      results: results,
    };

    console.log("🎉 Scheduled scraping complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Scheduled scraper error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
