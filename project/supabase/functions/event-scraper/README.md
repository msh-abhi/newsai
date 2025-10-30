# Event Scraper Edge Function

This Edge Function intelligently scrapes autism-friendly and sensory-friendly events from multiple Miami-area sources, filters them based on keywords, and stores them in the database.

## Features

- **Intelligent Keyword Filtering**: Automatically filters events based on keywords like "autism", "sensory-friendly", "inclusive", "adaptive", "disabilities", and "special needs"
- **Relevance Scoring**: Each event receives a relevance score (0-100) based on keyword matches
- **Multiple Source Support**: Custom scrapers for 16+ Miami area event sources
- **Generic Fallback Scraper**: Handles sources without custom scraper logic
- **Error Handling**: Tracks success/failure for each source with detailed metrics
- **Test Mode**: Preview scraped events without saving to database

## Deployment

### Option 1: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy event-scraper
```

### Option 2: Using n8n Automation

Since you mentioned using n8n to trigger daily scraping, here's how to call the function from n8n:

1. Create an HTTP Request node in n8n
2. Configure it as follows:
   - Method: POST
   - URL: `https://your-project-ref.supabase.co/functions/v1/event-scraper`
   - Headers:
     - `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
     - `Content-Type`: `application/json`
   - Body (JSON):
     ```json
     {
       "organization_id": "your-organization-id"
     }
     ```

3. Schedule it to run daily using n8n's Cron node

## API Reference

### Request Body

```typescript
{
  organization_id: string;    // Required: Organization ID
  source_ids?: string[];      // Optional: Specific sources to scrape
  test_mode?: boolean;        // Optional: Preview without saving (default: false)
}
```

### Response

```typescript
{
  success: boolean;
  message: string;
  total_events: number;
  sources_processed: number;
  sources_failed: number;
  events?: ScrapedEvent[];    // Only in test_mode
}
```

## Supported Event Sources

The scraper includes custom logic for these Miami-area sources:

1. **Eventbrite Miami** - Autism-specific events
2. **Miami-Dade County Parks** - Family recreation programs
3. **The Children's Trust** - Youth development programs
4. **Miami-Dade Public Library** - Community events
5. **City of Miami Events** - Municipal events and activities
6. **Miami Beach Events** - Beach city events
7. **City of Coral Gables** - Coral Gables events
8. **UM-CARD** - Autism programs from University of Miami
9. **Miami on the Cheap** - Free and affordable family events
10. **Munchkin Fun Miami** - Kids activities
11. **Mommy Poppins Miami** - Family-friendly events
12. **Kids Out and About Miami** - Children's activities
13. **All Kids Included (AKI)** - Accessible arts experiences
14. **Miami Children's Museum** - Museum events and programs
15. **Adrienne Arsht Center** - Performing arts for families
16. **Parent Academy Miami** - Family support and education

## Filtering Logic

Events are filtered based on keyword matches in titles and descriptions:

- **Title Match**: +30 points
- **Description Match**: +15 points
- **Exact Word Boundary Match**: +10 additional points

Minimum relevance threshold: 20 points

Keywords used for filtering:
- autism
- sensory
- sensory-friendly
- adaptive
- inclusive
- disabilities
- special needs
- accessible
- developmental
- family support

## Performance Metrics

Each source tracks:
- `last_success`: Whether the last scrape succeeded
- `events_found`: Number of events found in last scrape
- `last_error`: Error message if scraping failed
- `last_attempt`: Timestamp of last scrape attempt

## Error Handling

The scraper:
- Continues processing remaining sources if one fails
- Updates performance metrics for each source
- Returns aggregate success/failure statistics
- Logs detailed errors for debugging

## Testing

To test a specific source without saving to the database:

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/event-scraper' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "your-org-id",
    "source_ids": ["source-id-to-test"],
    "test_mode": true
  }'
```

## Database Schema

Events are stored with the following structure:

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY,
  organization_id uuid,
  title text NOT NULL,
  description text,
  date_start timestamptz NOT NULL,
  date_end timestamptz,
  location text,
  url text,
  source_name text NOT NULL,
  source_id uuid,
  keywords_matched text[],
  relevance_score integer,
  metadata jsonb,
  is_featured boolean,
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(organization_id, title, date_start, source_name)
);
```

## Notes

- The function uses the `SUPABASE_SERVICE_ROLE_KEY` to bypass Row Level Security for scraping operations
- Events are deduplicated using `(organization_id, title, date_start, source_name)` unique constraint
- Date parsing is intelligent and handles various formats, defaulting to future dates when ambiguous
- The scraper respects robots.txt and uses appropriate User-Agent headers
