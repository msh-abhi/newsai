/*
  # ConvertKit Integration Schema

  1. New Tables
    - `convertkit_configs`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key, unique)
      - `api_key_encrypted` (text, encrypted API key)
      - `api_secret_encrypted` (text, encrypted API secret)
      - `is_active` (boolean, connection status)
      - `last_tested_at` (timestamp, last connection test)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `convertkit_configs` table
    - Add policies for organization-scoped access
*/

CREATE TABLE IF NOT EXISTS convertkit_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  api_key_encrypted text NOT NULL,
  api_secret_encrypted text NOT NULL,
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE convertkit_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage ConvertKit configs in their organization"
  ON convertkit_configs
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_convertkit_configs_org_id ON convertkit_configs(organization_id);