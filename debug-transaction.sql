-- Debug Transaction and MeterValues Issue
-- Run this in your Supabase SQL editor to diagnose the problem

-- 1. Check if transaction exists and its current state
SELECT
  id,
  "stationId",
  "transactionId",
  "isActive",
  "startTime",
  "endTime",
  "createdAt",
  "updatedAt"
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
ORDER BY "createdAt" DESC
LIMIT 5;

-- 2. Check recent MeterValues for this station
SELECT
  id,
  "transactionDatabaseId",
  "transactionId",
  timestamp,
  "createdAt",
  "sampledValue"
FROM "MeterValues"
WHERE "connectorId" IN (
  SELECT "connectorId"
  FROM "Connectors"
  WHERE "stationId" = 'WALLBOX-HOME-001'
)
ORDER BY timestamp DESC
LIMIT 20;

-- 3. Check if MeterValues have NULL transactionDatabaseId (not linked!)
SELECT
  COUNT(*) as unlinked_meter_values_count,
  MAX(timestamp) as latest_unlinked_timestamp
FROM "MeterValues"
WHERE "connectorId" IN (
  SELECT "connectorId"
  FROM "Connectors"
  WHERE "stationId" = 'WALLBOX-HOME-001'
)
AND "transactionDatabaseId" IS NULL;

-- 4. Check for transaction ID mismatches
SELECT DISTINCT
  mv."transactionId" as meter_value_transaction_id,
  t."transactionId" as database_transaction_id,
  mv.timestamp as latest_meter_value_timestamp
FROM "MeterValues" mv
LEFT JOIN "Transactions" t ON mv."transactionDatabaseId" = t.id
WHERE mv."connectorId" IN (
  SELECT "connectorId"
  FROM "Connectors"
  WHERE "stationId" = 'WALLBOX-HOME-001'
)
ORDER BY mv.timestamp DESC
LIMIT 10;
