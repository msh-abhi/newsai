/*
  # Knowledge Base Schema

  1. New Tables
    - `knowledge_items`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `title` (text, content title)
      - `content` (text, main content)
      - `type` (text, content category)
      - `embedding` (vector, for similarity search)
      - `metadata` (jsonb, additional data)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `knowledge_items` table
    - Add policies for organization-scoped access
*/

-- Enable the vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('company_info', 'expertise', 'work', 'website', 'social', 'custom')),
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage knowledge items in their organization"
  ON knowledge_items
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_items_org_id ON knowledge_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_type ON knowledge_items(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding ON knowledge_items USING ivfflat (embedding vector_cosine_ops);