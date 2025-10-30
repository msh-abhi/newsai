/*
  # Add Footer Text to Brand Configs

  1. Changes
    - Add `footer_text` column to `brand_configs` table
    - Allow organizations to customize newsletter footer content
    - Default to empty string for existing configurations

  2. Security
    - No RLS changes needed (inherits existing policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_configs' AND column_name = 'footer_text'
  ) THEN
    ALTER TABLE brand_configs ADD COLUMN footer_text text DEFAULT '';
  END IF;
END $$;