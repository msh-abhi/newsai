/*
  # Fix Organization Members RLS Policy

  1. Security Updates
    - Add missing policy to allow authenticated users to insert their own membership
    - This enables users to create organizations and become the initial owner

  2. Changes
    - New policy: "Allow authenticated user to insert their own membership"
    - Allows users to add themselves as organization members when creating new orgs
*/

CREATE POLICY "Allow authenticated user to insert their own membership"
  ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());