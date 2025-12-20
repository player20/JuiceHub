// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use strict';

// Simple JavaScript version for production use
// This avoids ts-node issues in Docker environment

async function syncDatabase() {
  try {
    console.log('Starting database force-sync...');

    // Dynamically import the compiled modules
    const { DefaultSequelizeInstance } = require('@citrineos/data');
    const { loadBootstrapConfig } = require('@citrineos/base');

    console.log('Loading bootstrap configuration...');
    const bootstrapConfig = loadBootstrapConfig();

    console.log('Getting Sequelize instance...');
    const sequelize = await DefaultSequelizeInstance.getInstance(bootstrapConfig);

    console.log('Synchronizing database with force:true (this will drop and recreate all tables)...');
    await sequelize.sync({ force: true });

    console.log('✅ Database synchronized successfully!');
    console.log('All tables have been created.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error synchronizing database:');
    console.error(error);
    process.exit(1);
  }
}

syncDatabase();
