/*
  # Update Event Sources Schema for Enhanced Scraping

  1. Changes
    - Add `scraping_config` column to store website-specific parsing rules
    - Add `performance_metrics` column to track scraping success rates
    - Update existing event sources with default configurations

  2. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add scraping configuration column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_sources' AND column_name = 'scraping_config'
  ) THEN
    ALTER TABLE event_sources ADD COLUMN scraping_config jsonb DEFAULT '{
      "selector": ".event, .calendar-event, [class*=\"event\"]",
      "title_selector": "h2, h3, .title, .event-title",
      "date_selector": ".date, .when, [class*=\"date\"], .event-date",
      "location_selector": ".location, .where, [class*=\"location\"], .event-location",
      "link_selector": "a"
    }'::jsonb;
  END IF;
END $$;

-- Add performance metrics column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_sources' AND column_name = 'performance_metrics'
  ) THEN
    ALTER TABLE event_sources ADD COLUMN performance_metrics jsonb DEFAULT '{
      "last_success": null,
      "events_found": 0,
      "last_error": null,
      "last_attempt": null
    }'::jsonb;
  END IF;
END $$;