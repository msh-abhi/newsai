-- Fix trigger to run with elevated privileges to bypass RLS

-- Recreate the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION auto_populate_event_sources()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Populate default event sources for the new organization
  PERFORM populate_default_event_sources(NEW.id);

  -- Also create default scraping filters (enabled by default)
  INSERT INTO scraping_filters (organization_id, filter_enabled)
  VALUES (NEW.id, true);

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS auto_populate_event_sources_trigger ON organizations;
CREATE TRIGGER auto_populate_event_sources_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_event_sources();
