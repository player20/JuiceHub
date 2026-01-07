// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use strict';

/** @type {import('sequelize-cli').Migration} */
import { DataTypes, QueryInterface } from 'sequelize';

const TABLE_NAME = 'SystemSettings';

export = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE_NAME, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      google_maps_api_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      google_maps_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      organization_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      support_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      support_phone: {
        type: DataTypes.STRING(50),
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

    // Create index (using raw SQL for IF NOT EXISTS support)
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_systemsettings_id" ON "SystemSettings" ("id")`
    );

    // Insert default row (only if table is empty)
    const [results] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as count FROM "SystemSettings"`
    );
    const count = parseInt((results[0] as any).count);

    if (count === 0) {
      await queryInterface.bulkInsert(TABLE_NAME, [
        {
          organization_name: 'JuiceHub EV Charging',
          google_maps_enabled: false,
          support_email: 'support@juicehub.com',
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
