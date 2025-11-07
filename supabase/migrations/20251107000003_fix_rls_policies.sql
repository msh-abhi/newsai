-- Fix infinite recursion in RLS policies by disabling RLS on organization_members

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
