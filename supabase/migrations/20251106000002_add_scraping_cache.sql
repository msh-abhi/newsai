/*
  # Add Scraping Cache Table

  1. New Tables
    - `scraping_cache`
      - `cache_key` (text, primary key): Unique identifier for cached results
      - `cached_data` (jsonb): JSON data of scraped events
      - `method_used` (text): Which scraping method was used
      - `events_count` (integer): Number of events cached
      - `created_at` (timestamptz): When cache was created
      - `updated_at` (timestamptz): When cache was last updated

  2. Security
    - Enable RLS on `scraping_cache` table
    - Add policies for service role access (internal use only)
*/

CREATE TABLE IF NOT EXISTS scraping_cache (
  cache_key text PRIMARY KEY,
  cached_data jsonb NOT NULL,
  method_used text NOT NULL,
  events_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scraping_cache ENABLE ROW LEVEL SECURITY;

-- Only service role can access cache (internal use)
CREATE POLICY "Service role can manage scraping cache"
  ON scraping_cache
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_scraping_cache_created_at ON scraping_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_scraping_cache_key ON scraping_cache(cache_key);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_scraping_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scraping_cache_updated_at_trigger
  BEFORE UPDATE ON scraping_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_cache_updated_at();
