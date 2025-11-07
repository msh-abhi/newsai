/*
  # Add Simple Scraping Filter Toggle

  1. New Tables
    - `scraping_filters`
      - `organization_id` (uuid, primary key, foreign key)
      - `filter_enabled` (boolean, default true)

  2. Security
    - Enable RLS on `scraping_filters` table
    - Add policies for organization-scoped access
*/

CREATE TABLE IF NOT EXISTS scraping_filters (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  filter_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scraping_filters ENABLE ROW LEVEL SECURITY;

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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_scraping_filters_org_id ON scraping_filters(organization_id);
