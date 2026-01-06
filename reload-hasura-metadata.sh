#!/bin/bash
# Reload Hasura Metadata
# This fixes GraphQL errors after database schema changes

HASURA_URL="https://juicehub-hasura.onrender.com/v1/metadata"
ADMIN_SECRET="${1:-}"

if [ -z "$ADMIN_SECRET" ]; then
  echo "Usage: ./reload-hasura-metadata.sh <HASURA_ADMIN_SECRET>"
  echo ""
  echo "Get the admin secret from:"
  echo "  https://dashboard.render.com → juicehub-hasura → Environment"
  exit 1
fi

echo "Reloading Hasura metadata..."
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{"type": "reload_metadata", "args": {"reload_remote_schemas": true, "reload_sources": true}}' \
  "$HASURA_URL"

echo ""
echo "Metadata reload complete!"
echo "The Variable and Component relationships should now be available."
