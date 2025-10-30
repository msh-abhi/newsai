/*
  # Add Brevo Email Provider Integration

  1. New Tables
    - `brevo_configs`
      - `id` (uuid, primary key) - Unique identifier for each Brevo configuration
      - `organization_id` (uuid, foreign key, unique) - References organizations table
      - `api_key_encrypted` (text) - Encrypted Brevo API key
      - `is_active` (boolean, default true) - Whether this configuration is active
      - `last_tested_at` (timestamptz) - Last time connection was tested
      - `created_at` (timestamptz) - When the configuration was created
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `brevo_configs` table
    - Add policies for authenticated users to manage their organization's Brevo configurations

  3. Constraints
    - One Brevo configuration per organization (unique constraint on organization_id)
    - Foreign key to organizations table with CASCADE delete

  4. Important Notes
    - Brevo (formerly Sendinblue) uses a single API key for authentication
    - API keys are encrypted before storage for security
    - Supports email campaigns, transactional emails, and contact management
    - Provides better international deliverability and fewer restrictions than ConvertKit
*/

-- Create brevo_configs table
CREATE TABLE IF NOT EXISTS brevo_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  api_key_encrypted text NOT NULL,
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE brevo_configs ENABLE ROW LEVEL SECURITY;

-- Policies for brevo_configs
CREATE POLICY "Users can manage Brevo configs in their organization"
  ON brevo_configs
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_brevo_configs_org_id ON brevo_configs(organization_id);
