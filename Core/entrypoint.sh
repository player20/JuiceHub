#!/bin/sh
set -e

# Create necessary directories for runtime
# Create both absolute and relative paths to handle different path resolution
mkdir -p /tmp/citrine
mkdir -p ./Server/tmp/citrine
echo "Created runtime directories: /tmp/citrine and ./Server/tmp/citrine"

# Default to migrate if DB_STRATEGY is not set
DB_STRATEGY=${DB_STRATEGY:-migrate}

echo "Executing DB strategy: $DB_STRATEGY"

if [ "$DB_STRATEGY" = "migrate" ]; then
    npm run migrate
elif [ "$DB_STRATEGY" = "sync" ]; then
    npm run sync-db
elif [ "$DB_STRATEGY" = "force-sync" ]; then
    npm run force-sync-db
elif [ "$DB_STRATEGY" = "none" ]; then
    echo "Skipping DB initialization."
else
    echo "Unknown DB_STRATEGY: $DB_STRATEGY. Defaulting to migrate."
    npm run migrate
fi

echo "Starting application..."
# The start-docker-cloud script in Server/package.json will be used, but without the migration part.
exec npm run start-docker-cloud --prefix ./Server

