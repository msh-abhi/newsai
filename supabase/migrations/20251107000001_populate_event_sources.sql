-- Populate default event sources for existing organizations
-- This will add the 16 default sources to any organization that doesn't have them

DO $$
DECLARE
    org_record RECORD;
BEGIN
    -- Loop through all organizations
    FOR org_record IN SELECT id FROM organizations LOOP
        -- Call the populate function for each organization
        PERFORM populate_default_event_sources(org_record.id);
    END LOOP;
END $$;
