/*
  # AI Providers Configuration Schema

  1. New Tables
    - `ai_providers`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `name` (text, provider name)
      - `type` (text, research/generation)
      - `api_key_encrypted` (text, encrypted API key)
      - `settings` (jsonb, model parameters)
      - `is_active` (boolean, enabled status)
      - `last_tested_at` (timestamp)
      - `test_success_rate` (numeric)
      - `monthly_usage` (integer)
      - `monthly_limit` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `ai_providers` table
    - Add policies for organization-scoped access
    - Encrypt API keys before storage
*/

CREATE TABLE IF NOT EXISTS ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('research', 'generation')),
  api_key_encrypted text DEFAULT '',
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  test_success_rate numeric(5,2) DEFAULT 0,
  monthly_usage integer DEFAULT 0,
  monthly_limit integer DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage AI providers in their organization"
  ON ai_providers
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_providers_org_id ON ai_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON ai_providers(type);