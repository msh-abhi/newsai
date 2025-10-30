/*
  # Analytics and Usage Tracking Schema

  1. New Tables
    - `newsletter_analytics`
      - `id` (uuid, primary key)
      - `newsletter_id` (uuid, foreign key)
      - `organization_id` (uuid, foreign key)
      - `opens` (integer, email opens)
      - `clicks` (integer, link clicks)
      - `sent_count` (integer, emails sent)
      - `bounce_rate` (numeric, bounce percentage)
      - `unsubscribe_count` (integer, unsubscribes)
      - `revenue_attributed` (numeric, revenue)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `event_sources`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `name` (text, source name)
      - `url` (text, website URL)
      - `keywords` (text[], search keywords)
      - `location` (jsonb, geographic filters)
      - `is_active` (boolean, enabled status)
      - `last_scraped_at` (timestamp)
      - `success_rate` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for organization-scoped access
*/

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
  is_active boolean DEFAULT true,
  last_scraped_at timestamptz,
  success_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE newsletter_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;

-- Analytics policies
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

-- Event sources policies
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_org_id ON newsletter_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_analytics_newsletter_id ON newsletter_analytics(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_event_sources_org_id ON event_sources(organization_id);