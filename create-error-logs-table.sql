-- ErrorLogs Table Creation
-- Purpose: Store system errors, OCPP errors, and application errors for monitoring
-- Date: January 7, 2026

CREATE TABLE IF NOT EXISTS "ErrorLogs" (
  id SERIAL PRIMARY KEY,

  -- Error Classification
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('ocpp', 'database', 'api', 'frontend', 'authentication', 'system', 'other')),
  error_code VARCHAR(50),

  -- Error Details
  message TEXT NOT NULL,
  error_details JSONB,  -- Structured error data (stack trace, context, etc.)

  -- Context
  component VARCHAR(100),  -- Which service/module: 'Core', 'OperatorUI', 'Hasura', etc.
  station_id VARCHAR(255),  -- Associated charging station (if applicable)
  transaction_id VARCHAR(50),  -- Associated transaction (if applicable)
  user_id VARCHAR(100),  -- User who triggered the error (if applicable)

  -- Tracking
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(100),
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_errorlogs_severity ON "ErrorLogs"(severity);
CREATE INDEX idx_errorlogs_category ON "ErrorLogs"(category);
CREATE INDEX idx_errorlogs_status ON "ErrorLogs"(status);
CREATE INDEX idx_errorlogs_station_id ON "ErrorLogs"(station_id) WHERE station_id IS NOT NULL;
CREATE INDEX idx_errorlogs_occurred_at ON "ErrorLogs"(occurred_at DESC);
CREATE INDEX idx_errorlogs_created_at ON "ErrorLogs"(created_at DESC);

-- Create composite index for filtering by status + severity
CREATE INDEX idx_errorlogs_status_severity ON "ErrorLogs"(status, severity);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_errorlogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_errorlogs_updated_at
BEFORE UPDATE ON "ErrorLogs"
FOR EACH ROW
EXECUTE FUNCTION update_errorlogs_updated_at();

-- Insert sample error for testing
INSERT INTO "ErrorLogs" (
  severity,
  category,
  error_code,
  message,
  error_details,
  component,
  station_id,
  status,
  occurred_at
) VALUES (
  'info',
  'system',
  'SYSTEM_INIT',
  'ErrorLogs table created successfully',
  '{"version": "1.0.0", "created_by": "migration"}'::jsonb,
  'Database',
  NULL,
  'resolved',
  NOW()
);

-- Verify table created
SELECT
  COUNT(*) as total_errors,
  severity,
  category,
  status
FROM "ErrorLogs"
GROUP BY severity, category, status
ORDER BY severity, category;
