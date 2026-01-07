// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use strict';

/** @type {import('sequelize-cli').Migration} */
import { DataTypes, QueryInterface } from 'sequelize';

const TABLE_NAME = 'ErrorLogs';

export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      severity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['critical', 'error', 'warning', 'info']],
        },
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [['ocpp', 'database', 'api', 'frontend', 'authentication', 'system', 'other']],
        },
      },
      error_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      error_details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      component: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      station_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      transaction_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      user_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'open',
        validate: {
          isIn: [['open', 'investigating', 'resolved', 'ignored']],
        },
      },
      occurred_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolved_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      resolution_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Create indexes for common queries (using raw SQL for IF NOT EXISTS support)
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_errorlogs_severity" ON "ErrorLogs" ("severity")`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_errorlogs_category" ON "ErrorLogs" ("category")`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_errorlogs_status" ON "ErrorLogs" ("status")`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_errorlogs_station_id" ON "ErrorLogs" ("station_id") WHERE station_id IS NOT NULL`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_errorlogs_occurred_at" ON "ErrorLogs" ("occurred_at" DESC)`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_errorlogs_created_at" ON "ErrorLogs" ("createdAt" DESC)`
    );

    // Create composite index for filtering by status + severity
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_errorlogs_status_severity" ON "ErrorLogs" ("status", "severity")`
    );

    // Insert sample error for testing (only if table is empty)
    const [results] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as count FROM "ErrorLogs"`
    );
    const count = parseInt((results[0] as any).count);

    if (count === 0) {
      await queryInterface.bulkInsert(TABLE_NAME, [
        {
          severity: 'info',
          category: 'system',
          error_code: 'SYSTEM_INIT',
          message: 'ErrorLogs table created successfully',
          error_details: { version: '1.0.0', created_by: 'migration' },
          component: 'Database',
          status: 'resolved',
          occurred_at: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE_NAME);
  },
};
