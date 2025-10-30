/*
  # Newsletter Management Schema

  1. New Tables
    - `newsletters`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `title` (text, newsletter title)
      - `content` (jsonb, structured content)
      - `html_content` (text, rendered HTML)
      - `status` (text, draft/generating/ready/sent)
      - `generation_progress` (integer, 0-100)
      - `generation_logs` (jsonb, progress logs)
      - `scheduled_at` (timestamp, when to send)
      - `sent_at` (timestamp, when sent)
      - `created_by` (uuid, user who created)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `brand_configs`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `colors` (jsonb, color scheme)
      - `logo_url` (text, logo image URL)
      - `font_family` (text, selected font)
      - `template` (text, template type)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for organization-scoped access
*/

CREATE TABLE IF NOT EXISTS newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  html_content text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'sent')),
  generation_progress integer DEFAULT 0 CHECK (generation_progress >= 0 AND generation_progress <= 100),
  generation_logs jsonb DEFAULT '[]'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  colors jsonb DEFAULT '{
    "primary": "#3B82F6",
    "secondary": "#8B5CF6", 
    "accent": "#F97316"
  }'::jsonb,
  logo_url text DEFAULT '',
  font_family text DEFAULT 'Inter',
  template text DEFAULT 'modern' CHECK (template IN ('modern', 'classic', 'minimal', 'creative')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_configs ENABLE ROW LEVEL SECURITY;

-- Newsletter policies
CREATE POLICY "Users can manage newsletters in their organization"
  ON newsletters
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Brand config policies
CREATE POLICY "Users can manage brand configs in their organization"
  ON brand_configs
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_newsletters_org_id ON newsletters(organization_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletters_created_by ON newsletters(created_by);
CREATE INDEX IF NOT EXISTS idx_brand_configs_org_id ON brand_configs(organization_id);