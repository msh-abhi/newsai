/*
  # Organizations and Multi-tenancy Schema

  1. New Tables
    - `organizations`
    - `organization_members`
  2. Security
    - Enable RLS on all tables
    - Add policies for organization-based access control
*/

-- Create the organizations table first (if it doesn't exist)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  settings jsonb DEFAULT '{
    "max_newsletters_per_month": 10,
    "max_team_members": 3,
    "custom_branding": false,
    "api_access": false
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Add created_by column to the organizations table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
  END IF;
END $$;

-- Update existing rows to set created_by for organizations that might already exist
-- Only do this if organization_members table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'organization_members'
  ) THEN
    UPDATE organizations
    SET created_by = (
      SELECT user_id FROM organization_members
      WHERE organization_id = organizations.id AND role = 'owner'
      LIMIT 1
    )
    WHERE created_by IS NULL;
  END IF;
END $$;

-- Make created_by NOT NULL after backfilling existing data
ALTER TABLE organizations
ALTER COLUMN created_by SET NOT NULL;

-- Create the organization_members table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS for both tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts when recreating
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they're members of" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organization members of their orgs" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;

--
-- Recreate the RLS Policies with the new created_by condition
--

-- New INSERT policy: allows any authenticated user to create an organization
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid()); -- Ensure the inserted row's created_by is the current user

-- Updated SELECT policy: allows users to view organizations they're members of OR they created
CREATE POLICY "Users can view organizations they're members of or created"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    ) OR created_by = auth.uid()
  );

-- UPDATE policy: organization owners can update their organization
CREATE POLICY "Organization owners can update their organization"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- SELECT policy for members: allows users to view members of their organization
CREATE POLICY "Users can view organization members of their orgs"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ALL policy for members: owners can manage all members of their organization
CREATE POLICY "Organization owners can manage members"
  ON organization_members
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
