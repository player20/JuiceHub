// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use strict';

/** @type {import('sequelize-cli').Migration} */
import { QueryInterface } from 'sequelize';

const TABLE_NAME = 'SystemSettings';

export = {
  up: async (queryInterface: QueryInterface) => {
    // Use raw SQL for complete control and idempotency
    await queryInterface.sequelize.query(`
      -- Create table if it doesn't exist
      CREATE TABLE IF NOT EXISTS "${TABLE_NAME}" (
        id SERIAL PRIMARY KEY,
        google_maps_api_key VARCHAR(255),
        google_maps_enabled BOOLEAN DEFAULT false,
        organization_name VARCHAR(255),
        support_email VARCHAR(255),
        support_phone VARCHAR(50),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      -- Create index if it doesn't exist
      CREATE INDEX IF NOT EXISTS "idx_systemsettings_id" ON "${TABLE_NAME}" ("id");

      -- Insert default row only if table is empty
      INSERT INTO "${TABLE_NAME}" (
        organization_name,
        google_maps_enabled,
        support_email,
        "createdAt",
        "updatedAt"
      )
      SELECT
        'JuiceHub EV Charging',
        false,
        'support@juicehub.com',
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "${TABLE_NAME}");
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE_NAME);
  },
};
