#!/bin/bash

# Track Missing Tables in Hasura
HASURA_ENDPOINT="https://juicehub-hasura.onrender.com"
ADMIN_SECRET="devadmin123"

echo "=========================================="
echo "Tracking Missing Tables in Hasura"
echo "=========================================="
echo ""

# Track SystemSettings
echo "Tracking SystemSettings table..."
curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_track_table",
    "args": {
      "source": "default",
      "schema": "public",
      "name": "SystemSettings"
    }
  }'
echo ""

# Track ErrorLogs
echo "Tracking ErrorLogs table..."
curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_track_table",
    "args": {
      "source": "default",
      "schema": "public",
      "name": "ErrorLogs"
    }
  }'
echo ""

echo "=========================================="
echo "✓ Tables tracked! Now setting permissions..."
echo "=========================================="
echo ""

# Set permissions for SystemSettings
echo "Setting permissions for SystemSettings..."
curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_create_select_permission",
    "args": {
      "table": {"schema": "public", "name": "SystemSettings"},
      "role": "admin",
      "permission": {
        "columns": "*",
        "filter": {},
        "allow_aggregations": true
      }
    }
  }'
echo ""

curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_create_insert_permission",
    "args": {
      "table": {"schema": "public", "name": "SystemSettings"},
      "role": "admin",
      "permission": {
        "check": {},
        "columns": "*"
      }
    }
  }'
echo ""

curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_create_update_permission",
    "args": {
      "table": {"schema": "public", "name": "SystemSettings"},
      "role": "admin",
      "permission": {
        "columns": "*",
        "filter": {}
      }
    }
  }'
echo ""

curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_create_delete_permission",
    "args": {
      "table": {"schema": "public", "name": "SystemSettings"},
      "role": "admin",
      "permission": {
        "filter": {}
      }
    }
  }'
echo ""

# Set permissions for ErrorLogs
echo "Setting permissions for ErrorLogs..."
curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_create_select_permission",
    "args": {
      "table": {"schema": "public", "name": "ErrorLogs"},
      "role": "admin",
      "permission": {
        "columns": "*",
        "filter": {},
        "allow_aggregations": true
      }
    }
  }'
echo ""

curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_create_insert_permission",
    "args": {
      "table": {"schema": "public", "name": "ErrorLogs"},
      "role": "admin",
      "permission": {
        "check": {},
        "columns": "*"
      }
    }
  }'
echo ""

curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_create_update_permission",
    "args": {
      "table": {"schema": "public", "name": "ErrorLogs"},
      "role": "admin",
      "permission": {
        "columns": "*",
        "filter": {}
      }
    }
  }'
echo ""

curl -X POST "$HASURA_ENDPOINT/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "X-Hasura-Admin-Secret: $ADMIN_SECRET" \
  -d '{
    "type": "pg_create_delete_permission",
    "args": {
      "table": {"schema": "public", "name": "ErrorLogs"},
      "role": "admin",
      "permission": {
        "filter": {}
      }
    }
  }'
echo ""

echo "=========================================="
echo "✓ All tables tracked and permissions set!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to https://juicehub-ui.onrender.com"
echo "2. Hard refresh (Cmd+Shift+R)"
echo "3. Permission errors should be gone"
