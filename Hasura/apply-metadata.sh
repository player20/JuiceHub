#!/bin/bash
# Apply Hasura metadata to production instance

set -e

HASURA_ENDPOINT="https://juicehub-hasura.onrender.com"
ADMIN_SECRET="${HASURA_GRAPHQL_ADMIN_SECRET:-}"

if [ -z "$ADMIN_SECRET" ]; then
  echo "Error: HASURA_GRAPHQL_ADMIN_SECRET environment variable not set"
  echo "Usage: HASURA_GRAPHQL_ADMIN_SECRET=your-secret ./apply-metadata.sh"
  exit 1
fi

echo "🔧 Applying Hasura metadata to $HASURA_ENDPOINT..."

# Track all tables in public schema
curl -s -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d '{
    "type": "bulk",
    "args": [
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Tenants"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "ChargingStations"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Transactions"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "TransactionEvents"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Authorizations"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Locations"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Evses"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Connectors"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "MeterValues"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Components"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Variables"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "VariableAttributes"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "VariableMonitoring"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Tariffs"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Subscriptions"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Certificates"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "SecurityEvents"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "StatusNotifications"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "BootNotifications"}, "source": "default"}},
      {"type": "pg_track_table", "args": {"table": {"schema": "public", "name": "Reservations"}, "source": "default"}}
    ]
  }' | jq .

echo ""
echo "✅ Metadata applied successfully!"
echo ""
echo "🔍 Verify at: $HASURA_ENDPOINT/console"
