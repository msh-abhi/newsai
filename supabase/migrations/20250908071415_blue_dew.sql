/*
  # Create Events Table for Scraped Event Data

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `title` (text, event title)
      - `description` (text, event description)
      - `date_start` (timestamp, event start date/time)
      - `date_end` (timestamp, event end date/time)
      - `location` (text, event location)
      - `url` (text, event URL)
      - `source_name` (text, which source scraped this)
      - `source_id` (uuid, reference to event_sources)
      - `keywords_matched` (text[], matched filter keywords)
      - `relevance_score` (integer, 0-100 relevance rating)
      - `embedding` (vector, for similarity search)
      - `metadata` (jsonb, additional event data)
      - `is_featured` (boolean, manually featured events)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `events` table
    - Add policies for organization-scoped access

  3. Indexes
    - Performance indexes for common queries
    - Vector index for similarity search
*/

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_date_start ON events(date_start);
CREATE INDEX IF NOT EXISTS idx_events_relevance ON events(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source_id);
CREATE INDEX IF NOT EXISTS idx_events_keywords ON events USING GIN(keywords_matched);
CREATE INDEX IF NOT EXISTS idx_events_embedding ON events USING ivfflat (embedding vector_cosine_ops);

-- Create function for similarity search
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