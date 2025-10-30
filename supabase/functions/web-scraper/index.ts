/*
  # Web Scraper Edge Function
  
  Extracts content from web pages for knowledge base import.
  Handles various content types and formats.
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ScrapeRequest {
  url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url }: ScrapeRequest = await req.json();

    if (!url || !isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI Newsletter Bot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract content using simple regex patterns
    const title = extractTitle(html);
    const content = extractContent(html);

    return new Response(
      JSON.stringify({ 
        title: title || 'Imported Content',
        content: content || 'Content extracted from the provided URL.',
        url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Web scraper error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();
  
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();
  
  return '';
}

function extractContent(html: string): string {
  // Remove script and style tags
  let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract text from common content containers
  const contentSelectors = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  
  for (const selector of contentSelectors) {
    const match = content.match(selector);
    if (match) {
      content = match[1];
      break;
    }
  }
  
  // Remove HTML tags and clean up
  content = content.replace(/<[^>]+>/g, ' ');
  content = content.replace(/\s+/g, ' ');
  content = content.trim();
  
  // Limit content length
  if (content.length > 2000) {
    content = content.substring(0, 2000) + '...';
  }
  
  return content;
}