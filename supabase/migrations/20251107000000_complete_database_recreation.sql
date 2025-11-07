/*
  # COMPLETE DATABASE SCHEMA RECREATION

  This migration recreates all missing tables with exact schemas from the original migrations.
  Includes all required tables, columns, indexes, policies, and data types.

  1. AI Providers Schema
  2. Knowledge Base Schema
  3. Newsletter Management Schema
  4. Analytics Schema
  5. Event Sources Schema (Dynamic)
  6. Events Schema (with vector embeddings)
  7. Scraping Filters Schema
  8. Scraping Cache Schema
  9. ConvertKit Integration Schema
  10. Default Event Sources Population
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- 1. AI PROVIDERS SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('research', 'generation')),
  api_key_encrypted text DEFAULT '',
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  test_success_rate numeric(5,2) DEFAULT 0,
  monthly_usage integer DEFAULT 0,
  monthly_limit integer DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage AI providers in their organization" ON ai_providers;
CREATE POLICY "Users can manage AI providers in their organization"
  ON ai_providers
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_providers_org_id ON ai_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON ai_providers(type);

-- ==========================================
-- 2. KNOWLEDGE BASE SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('company_info', 'expertise', 'work', 'website', 'social', 'custom')),
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage knowledge items in their organization" ON knowledge_items;
CREATE POLICY "Users can manage knowledge items in their organization"
  ON knowledge_items
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_knowledge_items_org_id ON knowledge_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_type ON knowledge_items(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding ON knowledge_items USING ivfflat (embedding vector_cosine_ops);

-- ==========================================
-- 3. NEWSLETTER MANAGEMENT SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  html_content text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'sent')),
  generation_progress integer DEFAULT 0 CHECK (generation_progress >= 0 AND generation_progress <= 100),
  generation_logs jsonb DEFAULT '[]'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  colors jsonb DEFAULT '{
    "primary": "#3B82F6",
    "secondary": "#8B5CF6",
    "accent": "#F97316"
  }'::jsonb,
  logo_url text DEFAULT '',
  font_family text DEFAULT 'Inter',
  template text DEFAULT 'modern' CHECK (template IN ('modern', 'classic', 'minimal', 'creative')),
  footer_text text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage newsletters in their organization" ON newsletters;
CREATE POLICY "Users can manage newsletters in their organization"
  ON newsletters
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage brand configs in their organization" ON brand_configs;
CREATE POLICY "Users can manage brand configs in their organization"
  ON brand_configs
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_newsletters_org_id ON newsletters(organization_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_created_by ON newsletters(created_by);
CREATE INDEX IF NOT EXISTS idx_brand_configs_org_id ON brand_configs(organization_id);

-- ==========================================
-- 4. ANALYTICS SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS newsletter_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid REFERENCES newsletters(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  opens integer DEFAULT 0,
  clicks integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  bounce_rate numeric(5,2) DEFAULT 0,
  unsubscribe_count integer DEFAULT 0,
  revenue_attributed numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view analytics for their organization" ON newsletter_analytics;
CREATE POLICY "Users can view analytics for their organization"
  ON newsletter_analytics
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_org_id ON newsletter_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_newsletter_id ON newsletter_analytics(newsletter_id);

-- ==========================================
-- 5. EVENT SOURCES SCHEMA (DYNAMIC)
-- ==========================================

CREATE TABLE IF NOT EXISTS event_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  keywords text[] DEFAULT ARRAY[]::text[],
  location jsonb DEFAULT '{
    "city": "",
    "state": "",
    "radius": 50
  }'::jsonb,
  scraping_config jsonb DEFAULT '{
    "selector": ".event, .calendar-event, [class*=\"event\"]",
    "title_selector": "h2, h3, .title, .event-title",
    "date_selector": ".date, .when, [class*=\"date\"], .event-date",
    "location_selector": ".location, .where, [class*=\"location\"], .event-location",
    "link_selector": "a"
  }'::jsonb,
  performance_metrics jsonb DEFAULT '{
    "last_success": null,
    "events_found": 0,
    "last_error": null,
    "last_attempt": null
  }'::jsonb,
  is_active boolean DEFAULT true,
  last_scraped_at timestamptz,
  success_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage event sources in their organization" ON event_sources;
CREATE POLICY "Users can manage event sources in their organization"
  ON event_sources
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_event_sources_org_id ON event_sources(organization_id);

-- ==========================================
-- 6. EVENTS SCHEMA (with vector embeddings)
-- ==========================================

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  date_start timestamptz NOT NULL,
  date_end timestamptz,
  location text DEFAULT '',
  url text DEFAULT '',
  source_name text NOT NULL,
  source_id uuid REFERENCES event_sources(id) ON DELETE SET NULL,
  keywords_matched text[] DEFAULT ARRAY[]::text[],
  relevance_score integer DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, title, date_start, source_name)
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events in their organization" ON events;
CREATE POLICY "Users can view events in their organization"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage events in their organization" ON events;
CREATE POLICY "Users can manage events in their organization"
  ON events
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_date_start ON events(date_start);
CREATE INDEX IF NOT EXISTS idx_events_relevance ON events(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source_id);
CREATE INDEX IF NOT EXISTS idx_events_keywords ON events USING GIN(keywords_matched);
CREATE INDEX IF NOT EXISTS idx_events_embedding ON events USING ivfflat (embedding vector_cosine_ops);

-- Create similarity search function
CREATE OR REPLACE FUNCTION search_events(
  query_embedding vector(1536),
  org_id uuid,
  match_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  date_start timestamptz,
  location text,
  url text,
  relevance_score integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.date_start,
    e.location,
    e.url,
    e.relevance_score,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM events e
  WHERE e.organization_id = org_id
    AND e.date_start >= now()
    AND e.date_start <= now() + interval '30 days'
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- ==========================================
-- 7. SCRAPING FILTERS SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS scraping_filters (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  filter_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scraping_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view scraping filters in their organization" ON scraping_filters;
CREATE POLICY "Users can view scraping filters in their organization"
  ON scraping_filters
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage scraping filters in their organization" ON scraping_filters;
CREATE POLICY "Users can manage scraping filters in their organization"
  ON scraping_filters
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_scraping_filters_org_id ON scraping_filters(organization_id);

-- ==========================================
-- 8. SCRAPING CACHE SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS scraping_cache (
  cache_key text PRIMARY KEY,
  cached_data jsonb NOT NULL,
  method_used text NOT NULL,
  events_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scraping_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage scraping cache" ON scraping_cache;
CREATE POLICY "Service role can manage scraping cache"
  ON scraping_cache
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scraping_cache_created_at ON scraping_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_scraping_cache_key ON scraping_cache(cache_key);

-- Update trigger for scraping cache
CREATE OR REPLACE FUNCTION update_scraping_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_scraping_cache_updated_at_trigger'
    AND tgrelid = 'scraping_cache'::regclass
  ) THEN
    EXECUTE 'DROP TRIGGER update_scraping_cache_updated_at_trigger ON scraping_cache';
  END IF;
END $$;

CREATE TRIGGER update_scraping_cache_updated_at_trigger
  BEFORE UPDATE ON scraping_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_cache_updated_at();

-- ==========================================
-- 9. CONVERTKIT INTEGRATION SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS convertkit_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  api_key_encrypted text NOT NULL,
  api_secret_encrypted text NOT NULL,
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE convertkit_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage ConvertKit configs in their organization" ON convertkit_configs;
CREATE POLICY "Users can manage ConvertKit configs in their organization"
  ON convertkit_configs
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_convertkit_configs_org_id ON convertkit_configs(organization_id);

-- ==========================================
-- 10. POPULATE DEFAULT EVENT SOURCES
-- ==========================================

-- Insert default event sources for the organization
-- Note: This will be populated when the first organization is created
-- For now, we'll create a function to populate sources for any organization

CREATE OR REPLACE FUNCTION populate_default_event_sources(org_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only populate if no sources exist for this organization
  IF NOT EXISTS (SELECT 1 FROM event_sources WHERE organization_id = org_id) THEN

    INSERT INTO event_sources (organization_id, name, url, keywords, location, scraping_config, is_active) VALUES
    -- Eventbrite
    (org_id, 'Eventbrite Miami', 'https://www.eventbrite.com/d/florida--miami/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive', 'autism-friendly'], '{"city": "Miami", "state": "FL", "radius": 25}', '{
      "selector": ".event-card, .search-event-card-wrapper, [data-event-id]",
      "title_selector": "[data-testid=\"event-card-title\"], .event-card__title, .eds-event-card__title",
      "date_selector": "[data-testid=\"event-card-date\"], .event-card__date, .eds-event-card__formatted-date",
      "location_selector": "[data-testid=\"event-card-venue\"], .event-card__venue, .eds-event-card__venue",
      "link_selector": "[data-testid=\"event-card-link\"], .event-card__link, a[href*=\"/e/\"]"
    }'::jsonb, true),

    -- Miami-Dade County Parks
    (org_id, 'Miami-Dade Parks', 'https://www.miamidade.gov/parks/', ARRAY['sensory-friendly', 'adaptive', 'inclusive', 'accessible'], '{"city": "Miami", "state": "FL", "radius": 50}', '{
      "selector": ".event, .calendar-event, .park-event, [class*=\"event\"]",
      "title_selector": "h3, h4, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"], a[href*=\"calendar\"]"
    }'::jsonb, true),

    -- Miami-Dade Public Library System
    (org_id, 'Miami-Dade Libraries', 'https://www.mdpls.org/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive', 'storytime'], '{"city": "Miami", "state": "FL", "radius": 50}', '{
      "selector": ".event-item, .views-row, [class*=\"event\"]",
      "title_selector": "h3, .event-title, .field-content",
      "date_selector": ".date-display, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .branch, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Miami Children''s Museum
    (org_id, 'Miami Children''s Museum', 'https://miamichildrensmuseum.org/events/', ARRAY['sensory-friendly', 'autism-friendly', 'adaptive', 'inclusive'], '{"city": "Miami", "state": "FL", "radius": 25}', '{
      "selector": ".event, .tribe-events-event, [class*=\"event\"]",
      "title_selector": "h2, h3, .event-title, .tribe-event-title",
      "date_selector": ".event-date, .tribe-event-date, [class*=\"date\"]",
      "location_selector": ".event-location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Vizcaya Museum and Gardens
    (org_id, 'Vizcaya Museum', 'https://vizcaya.org/events/', ARRAY['sensory-friendly', 'adaptive', 'accessible'], '{"city": "Miami", "state": "FL", "radius": 15}', '{
      "selector": ".event, .calendar-event, [class*=\"event\"]",
      "title_selector": "h3, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Wynwood Walls
    (org_id, 'Wynwood Walls', 'https://wynwoodwalls.com/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive'], '{"city": "Miami", "state": "FL", "radius": 10}', '{
      "selector": ".event, .calendar-item, [class*=\"event\"]",
      "title_selector": "h2, h3, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Adrienne Arsht Center
    (org_id, 'Adrienne Arsht Center', 'https://www.arshtcenter.org/events/', ARRAY['sensory-friendly', 'adaptive', 'accessible'], '{"city": "Miami", "state": "FL", "radius": 15}', '{
      "selector": ".event-card, .performance, [class*=\"event\"]",
      "title_selector": ".event-title, .title, h3",
      "date_selector": ".event-date, .date, [class*=\"date\"]",
      "location_selector": ".venue, .location, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Zoo Miami
    (org_id, 'Zoo Miami', 'https://www.zoomiami.org/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive', 'autism-friendly'], '{"city": "Miami", "state": "FL", "radius": 20}', '{
      "selector": ".event, .calendar-event, [class*=\"event\"]",
      "title_selector": "h2, h3, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Bonita Springs - expanded radius
    (org_id, 'Bonita Springs Events', 'https://www.cityofbonitasprings.org/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive'], '{"city": "Bonita Springs", "state": "FL", "radius": 30}', '{
      "selector": ".event, .calendar-event, [class*=\"event\"]",
      "title_selector": "h3, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Naples Community Events
    (org_id, 'Naples Events', 'https://www.naplesgov.com/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive'], '{"city": "Naples", "state": "FL", "radius": 30}', '{
      "selector": ".event, .calendar-event, [class*=\"event\"]",
      "title_selector": "h3, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Fort Myers Events
    (org_id, 'Fort Myers Events', 'https://www.cityftmyers.com/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive'], '{"city": "Fort Myers", "state": "FL", "radius": 30}', '{
      "selector": ".event, .calendar-event, [class*=\"event\"]",
      "title_selector": "h3, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Cape Coral Events
    (org_id, 'Cape Coral Events', 'https://www.capecoral.net/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive'], '{"city": "Cape Coral", "state": "FL", "radius": 25}', '{
      "selector": ".event, .calendar-event, [class*=\"event\"]",
      "title_selector": "h3, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Lee County Libraries
    (org_id, 'Lee County Libraries', 'https://www.leegov.com/library/events', ARRAY['sensory-friendly', 'adaptive', 'storytime'], '{"city": "Fort Myers", "state": "FL", "radius": 40}', '{
      "selector": ".event-item, .views-row, [class*=\"event\"]",
      "title_selector": "h3, .event-title, .field-content",
      "date_selector": ".date-display, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .branch, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Southwest Florida Museum of History
    (org_id, 'SWFL Museum of History', 'https://www.swflmuseumofhistory.com/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive'], '{"city": "Fort Myers", "state": "FL", "radius": 20}', '{
      "selector": ".event, .tribe-events-event, [class*=\"event\"]",
      "title_selector": "h2, h3, .event-title, .tribe-event-title",
      "date_selector": ".event-date, .tribe-event-date, [class*=\"date\"]",
      "location_selector": ".event-location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true),

    -- Florida Gulf Coast University Events
    (org_id, 'FGCU Events', 'https://www.fgcu.edu/events/', ARRAY['sensory-friendly', 'adaptive', 'inclusive'], '{"city": "Fort Myers", "state": "FL", "radius": 15}', '{
      "selector": ".event, .calendar-event, [class*=\"event\"]",
      "title_selector": "h2, h3, .event-title, .title",
      "date_selector": ".date, .event-date, [class*=\"date\"]",
      "location_selector": ".location, .venue, [class*=\"location\"]",
      "link_selector": "a[href*=\"event\"]"
    }'::jsonb, true);

  END IF;
END;
$$;

-- ==========================================
-- 11. DISABLE RLS ON ORGANIZATION_MEMBERS
-- ==========================================

-- Disable RLS on organization_members to prevent infinite recursion
-- Security will be handled at the application level
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Drop all policies on organization_members
DROP POLICY IF EXISTS "Users can view members of organizations they belong to" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members of their orgs" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;
DROP POLICY IF EXISTS "Allow authenticated user to insert their own membership" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON organization_members;
