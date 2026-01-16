#!/bin/bash

# Hasura Bulk Permissions Setter
# Sets admin role permissions on ALL tables

HASURA_ENDPOINT="https://juicehub-hasura.onrender.com"
ADMIN_SECRET="devadmin123"

# List of all tables
TABLES=(
  "ChargingStations"
  "Connectors"
  "Transactions"
  "MeterValues"
  "Locations"
  "Authorizations"
  "VariableAttributes"
  "Component"
  "Variable"
  "SystemSettings"
  "ErrorLogs"
  "SequelizeMeta"
  "Tenants"
  "TenantPartners"
  "AsyncJobStatuses"
  "Evses"
)

# Function to create permissions for a table
set_table_permissions() {
  local table_name=$1

  echo "Setting permissions for $table_name..."

  # Create select permission
  curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
    -d '{
      "type": "pg_create_select_permission",
      "args": {
        "table": {"schema": "public", "name": "'"$table_name"'"},
        "role": "admin",
        "permission": {
          "columns": "*",
          "filter": {},
          "allow_aggregations": true
        }
      }
    }' 2>/dev/null

  # Create insert permission
  curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
    -d '{
      "type": "pg_create_insert_permission",
      "args": {
        "table": {"schema": "public", "name": "'"$table_name"'"},
        "role": "admin",
        "permission": {
          "check": {},
          "columns": "*"
        }
      }
    }' 2>/dev/null

  # Create update permission
  curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
    -d '{
      "type": "pg_create_update_permission",
      "args": {
        "table": {"schema": "public", "name": "'"$table_name"'"},
        "role": "admin",
        "permission": {
          "columns": "*",
          "filter": {}
        }
      }
    }' 2>/dev/null

  # Create delete permission
  curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
    -d '{
      "type": "pg_create_delete_permission",
      "args": {
        "table": {"schema": "public", "name": "'"$table_name"'"},
        "role": "admin",
        "permission": {
          "filter": {}
        }
      }
    }' 2>/dev/null

  echo "✓ Permissions set for $table_name"
}

echo "=========================================="
echo "Setting Hasura Permissions for Admin Role"
echo "=========================================="
echo ""

# Loop through all tables and set permissions
for table in "${TABLES[@]}"; do
  set_table_permissions "$table"
  echo ""
done

echo "=========================================="
echo "✓ All permissions set successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to https://juicehub-ui.onrender.com"
echo "2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "3. Permission errors should be gone"
