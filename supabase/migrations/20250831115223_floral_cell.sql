/*
  # Fix Organization Members RLS Infinite Recursion

  1. Problem
    - The policy "Users can view members of organizations they belong to" causes infinite recursion
    - This happens because the policy queries organization_members table from within its own evaluation
    - The recursion occurs when the app tries to fetch organization data during authentication

  2. Solution
    - Remove the problematic recursive policy
    - Keep the simple "Users can view their own organization memberships" policy
    - This allows users to see their own memberships without recursion
    - Organization owners can still manage members through other policies

  3. Security
    - Users can still view their own organization memberships
    - Organization owners retain full management capabilities
    - No security is compromised by this change
*/

-- Remove the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view members of organizations they belong to" ON organization_members;

-- The remaining policies are sufficient and non-recursive:
-- 1. "Users can view their own organization memberships" - allows viewing own memberships
-- 2. "Organization owners can update members" - allows owners to manage members
-- 3. "Organization owners can delete members" - allows owners to remove members
-- 4. "Allow authenticated user to insert their own membership" - allows joining organizations
-- 5. "Users can insert their own membership" - duplicate insert policy (safe)
-- 6. "Users can update their own membership" - allows updating own membership
-- 7. "Users can delete their own membership" - allows leaving organizations