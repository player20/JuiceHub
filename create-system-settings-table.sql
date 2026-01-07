-- SystemSettings Table Creation
-- Purpose: Store system-wide configuration settings including API keys
-- Date: January 7, 2026

CREATE TABLE IF NOT EXISTS "SystemSettings" (
  id SERIAL PRIMARY KEY,

  -- Google Maps Configuration
  google_maps_api_key VARCHAR(255),
  google_maps_enabled BOOLEAN DEFAULT false,

  -- General Settings (for future expansion)
  organization_name VARCHAR(255),
  support_email VARCHAR(255),
  support_phone VARCHAR(50),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_systemsettings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_systemsettings_updated_at
BEFORE UPDATE ON "SystemSettings"
FOR EACH ROW
EXECUTE FUNCTION update_systemsettings_updated_at();

-- Insert default row (only one row should exist in this table)
INSERT INTO "SystemSettings" (
  organization_name,
  google_maps_enabled,
  support_email
) VALUES (
  'JuiceHub EV Charging',
  false,
  'support@juicehub.com'
) ON CONFLICT DO NOTHING;

-- Create index
CREATE INDEX idx_systemsettings_id ON "SystemSettings"(id);

-- Verify table created
SELECT
  id,
  organization_name,
  google_maps_api_key,
  google_maps_enabled,
  created_at
FROM "SystemSettings"
LIMIT 1;
