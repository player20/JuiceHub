#!/bin/bash
# Setup Hasura permissions for all tables

set -e

HASURA_ENDPOINT="https://juicehub-hasura.onrender.com"
ADMIN_SECRET="${HASURA_GRAPHQL_ADMIN_SECRET:-devadmin123}"

echo "🔧 Setting up Hasura permissions for all tables..."

# List of all tables
TABLES=(
  "AsyncJobStatuses"
  "Authorizations"
  "Boots"
  "Certificates"
  "ChangeConfigurations"
  "ChargingNeeds"
  "ChargingProfiles"
  "ChargingSchedules"
  "ChargingStations"
  "Components"
  "Connectors"
  "Evses"
  "InstalledCertificates"
  "LocalListAuthorizations"
  "Locations"
  "MeterValues"
  "PartnerUsers"
  "Partners"
  "Reservations"
  "SecurityEvents"
  "ServerNetworkProfiles"
  "StatusNotifications"
  "Subscriptions"
  "Tariffs"
  "TenantPartners"
  "Tenants"
  "TransactionEvents"
  "Transactions"
  "VariableAttributes"
  "VariableMonitoring"
  "Variables"
  "usage_snapshots"
)

# Function to create permissions for a table
create_permissions() {
  local table=$1
  echo "  📋 Setting permissions for: $table"

  # Create admin role permissions (full access)
  curl -s -X POST "$HASURA_ENDPOINT/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d "{
      \"type\": \"pg_create_select_permission\",
      \"args\": {
        \"table\": {\"schema\": \"public\", \"name\": \"$table\"},
        \"role\": \"admin\",
        \"permission\": {
          \"columns\": \"*\",
          \"filter\": {},
          \"allow_aggregations\": true
        },
        \"source\": \"default\"
      }
    }" > /dev/null

  curl -s -X POST "$HASURA_ENDPOINT/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d "{
      \"type\": \"pg_create_insert_permission\",
      \"args\": {
        \"table\": {\"schema\": \"public\", \"name\": \"$table\"},
        \"role\": \"admin\",
        \"permission\": {
          \"check\": {},
          \"columns\": \"*\"
        },
        \"source\": \"default\"
      }
    }" > /dev/null

  curl -s -X POST "$HASURA_ENDPOINT/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d "{
      \"type\": \"pg_create_update_permission\",
      \"args\": {
        \"table\": {\"schema\": \"public\", \"name\": \"$table\"},
        \"role\": \"admin\",
        \"permission\": {
          \"filter\": {},
          \"columns\": \"*\"
        },
        \"source\": \"default\"
      }
    }" > /dev/null

  curl -s -X POST "$HASURA_ENDPOINT/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d "{
      \"type\": \"pg_create_delete_permission\",
      \"args\": {
        \"table\": {\"schema\": \"public\", \"name\": \"$table\"},
        \"role\": \"admin\",
        \"permission\": {
          \"filter\": {}
        },
        \"source\": \"default\"
      }
    }" > /dev/null

  echo "    ✅ Done"
}

# Apply permissions to all tables
for table in "${TABLES[@]}"; do
  create_permissions "$table"
done

echo ""
echo "✅ All permissions configured successfully!"
echo ""
echo "🔍 Verify at: $HASURA_ENDPOINT/console"
