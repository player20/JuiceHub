// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use strict';

/** @type {import('sequelize-cli').Migration} */
import { QueryInterface } from 'sequelize';

const TABLE_NAME = 'ErrorLogs';

export = {
  up: async (queryInterface: QueryInterface) => {
    // Use raw SQL for complete control and idempotency
    await queryInterface.sequelize.query(`
      -- Create table if it doesn't exist
      CREATE TABLE IF NOT EXISTS "${TABLE_NAME}" (
        id SERIAL PRIMARY KEY,
        severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
        category VARCHAR(50) NOT NULL CHECK (category IN ('ocpp', 'database', 'api', 'frontend', 'authentication', 'system', 'other')),
        error_code VARCHAR(50),
        message TEXT NOT NULL,
        error_details JSONB,
        component VARCHAR(100),
        station_id VARCHAR(255),
        transaction_id VARCHAR(50),
        user_id VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
        occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by VARCHAR(100),
        resolution_notes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      -- Create indexes if they don't exist
      CREATE INDEX IF NOT EXISTS "idx_errorlogs_severity" ON "${TABLE_NAME}" (severity);
      CREATE INDEX IF NOT EXISTS "idx_errorlogs_category" ON "${TABLE_NAME}" (category);
      CREATE INDEX IF NOT EXISTS "idx_errorlogs_status" ON "${TABLE_NAME}" (status);
      CREATE INDEX IF NOT EXISTS "idx_errorlogs_station_id" ON "${TABLE_NAME}" (station_id) WHERE station_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS "idx_errorlogs_occurred_at" ON "${TABLE_NAME}" (occurred_at DESC);
      CREATE INDEX IF NOT EXISTS "idx_errorlogs_created_at" ON "${TABLE_NAME}" ("createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_errorlogs_status_severity" ON "${TABLE_NAME}" (status, severity);

      -- Insert sample error only if table is empty
      INSERT INTO "${TABLE_NAME}" (
        severity,
        category,
        error_code,
        message,
        error_details,
        component,
        status,
        occurred_at,
        "createdAt",
        "updatedAt"
      )
      SELECT
        'info',
        'system',
        'SYSTEM_INIT',
        'ErrorLogs table created successfully',
        '{"version": "1.0.0", "created_by": "migration"}'::jsonb,
        'Database',
        'resolved',
        NOW(),
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "${TABLE_NAME}");
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE_NAME);
  },
};
