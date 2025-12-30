#!/bin/bash
# Query Session Data
# Useful for checking charging session data, debugging issues

HASURA_URL="${HASURA_URL:-https://juicehub-hasura.onrender.com/v1/graphql}"
ADMIN_SECRET="${HASURA_ADMIN_SECRET:-devadmin123}"
STATION_ID="${1:-WALLBOX-HOME-001}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "================================================"
echo "   JuiceHub Session Data Query"
echo "   Station: $STATION_ID"
echo "================================================"
echo ""

# 1. Charger Status
echo -e "${CYAN}=== Charger Status ===${NC}"
curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { ChargingStations(where: {id: {_eq: \\\"$STATION_ID\\\"}}) { id isOnline firmwareVersion chargePointVendor chargePointModel updatedAt } }\"
  }" | jq '.data.ChargingStations[0]'

echo ""

# 2. Connector Status
echo -e "${CYAN}=== Connector Status ===${NC}"
curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { Connectors(where: {stationId: {_eq: \\\"$STATION_ID\\\"}}) { connectorId status type maximumPowerWatts maximumAmperage maximumVoltage updatedAt } }\"
  }" | jq '.data.Connectors'

echo ""

# 3. Active Sessions
echo -e "${CYAN}=== Active Sessions ===${NC}"
curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { Transactions(where: {stationId: {_eq: \\\"$STATION_ID\\\"}, isActive: {_eq: true}}) { transactionId totalKwh timeSpentCharging startTime chargingState idToken } }\"
  }" | jq '.data.Transactions'

echo ""

# 4. Recent Sessions (Last 5)
echo -e "${CYAN}=== Recent Sessions (Last 5) ===${NC}"
curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { Transactions(where: {stationId: {_eq: \\\"$STATION_ID\\\"}, isActive: {_eq: false}}, order_by: {stopTime: desc}, limit: 5) { transactionId totalKwh timeSpentCharging startTime stopTime } }\"
  }" | jq '.data.Transactions'

echo ""

# 5. Last Heartbeat
echo -e "${CYAN}=== Last Heartbeat ===${NC}"
curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { OCPPMessages(where: {stationId: {_eq: \\\"$STATION_ID\\\"}, action: {_eq: \\\"Heartbeat\\\"}}, order_by: {createdAt: desc}, limit: 1) { createdAt } }\"
  }" | jq -r '.data.OCPPMessages[0].createdAt // "No heartbeat found"'

echo ""

# 6. Last MeterValues
echo -e "${CYAN}=== Last MeterValues ===${NC}"
curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { OCPPMessages(where: {stationId: {_eq: \\\"$STATION_ID\\\"}, action: {_eq: \\\"MeterValues\\\"}}, order_by: {createdAt: desc}, limit: 1) { createdAt message } }\"
  }" | jq '.data.OCPPMessages[0]'

echo ""

# 7. Message Stats (Last 24 hours)
echo -e "${CYAN}=== Message Stats (Last 24h) ===${NC}"
YESTERDAY=$(date -u -v-24H '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%SZ')

curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { Heartbeat: OCPPMessages_aggregate(where: {stationId: {_eq: \\\"$STATION_ID\\\"}, action: {_eq: \\\"Heartbeat\\\"}, createdAt: {_gte: \\\"$YESTERDAY\\\"}}) { aggregate { count } } MeterValues: OCPPMessages_aggregate(where: {stationId: {_eq: \\\"$STATION_ID\\\"}, action: {_eq: \\\"MeterValues\\\"}, createdAt: {_gte: \\\"$YESTERDAY\\\"}}) { aggregate { count } } StatusNotifications: OCPPMessages_aggregate(where: {stationId: {_eq: \\\"$STATION_ID\\\"}, action: {_eq: \\\"StatusNotification\\\"}, createdAt: {_gte: \\\"$YESTERDAY\\\"}}) { aggregate { count } } }\"
  }" | jq '{
    Heartbeats: .data.Heartbeat.aggregate.count,
    MeterValues: .data.MeterValues.aggregate.count,
    StatusNotifications: .data.StatusNotifications.aggregate.count
  }'

echo ""
echo "================================================"
echo -e "${GREEN}Query complete!${NC}"
echo "================================================"
