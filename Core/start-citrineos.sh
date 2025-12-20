#!/bin/bash
# Load environment variables and start CitrineOS

# Set bootstrap environment variables for database connection
export BOOTSTRAP_CITRINEOS_DATABASE_HOST=localhost
export BOOTSTRAP_CITRINEOS_DATABASE_PORT=5432
export BOOTSTRAP_CITRINEOS_DATABASE_NAME=citrine
export BOOTSTRAP_CITRINEOS_DATABASE_USERNAME=citrine
export BOOTSTRAP_CITRINEOS_DATABASE_PASSWORD=ioS65HzHTWxR3Wq86CHglWjmiIO3ZC8BCTq8Kd1AHWc=

# Additional config
export BOOTSTRAP_CITRINEOS_CONFIG_FILENAME=config.json
export BOOTSTRAP_CITRINEOS_FILE_ACCESS_TYPE=local

# Navigate to Server directory
cd Server

# Try database sync instead of migrations
echo "Syncing database schema..."
npm run sync-db

# Start the application
echo "Starting CitrineOS..."
npm start
