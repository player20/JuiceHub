-- PHASE 3: MeterValues & Live Stats Verification
-- Run in Supabase SQL Editor

-- ============================================================================
-- 1. Check recent MeterValues are being received and linked
-- ============================================================================
SELECT
  mv.id,
  mv."transactionDatabaseId",
  mv."transactionId",
  mv.timestamp,
  mv."createdAt",
  t."stationId",
  t."isActive",
  CASE
    WHEN mv."transactionDatabaseId" IS NULL THEN '❌ ORPHANED'
    ELSE '✅ LINKED'
  END as link_status,
  (mv."sampledValue"::jsonb -> 0 ->> 'measurand') as first_measurand
FROM "MeterValues" mv
LEFT JOIN "Transactions" t ON mv."transactionDatabaseId" = t.id
WHERE mv."connectorId" IN (
  SELECT "connectorId" FROM "Connectors" WHERE "stationId" = 'WALLBOX-HOME-001'
)
ORDER BY mv.timestamp DESC
LIMIT 20;

-- Expected:
-- - Recent MeterValues with timestamps in last 5 minutes
-- - link_status = "✅ LINKED" for all recent records
-- - transactionDatabaseId NOT NULL
-- - measurand shows "Energy.Active.Import.Register" or similar

-- ============================================================================
-- 2. Count orphaned vs linked MeterValues (last 24 hours)
-- ============================================================================
SELECT
  CASE
    WHEN "transactionDatabaseId" IS NULL THEN 'Orphaned (Not Linked)'
    ELSE 'Linked to Transaction'
  END as status,
  COUNT(*) as count,
  MIN(timestamp) as oldest_timestamp,
  MAX(timestamp) as newest_timestamp,
  EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 as time_span_minutes
FROM "MeterValues"
WHERE "connectorId" IN (
  SELECT "connectorId" FROM "Connectors" WHERE "stationId" = 'WALLBOX-HOME-001'
)
AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY status;

-- Expected (after fix):
-- Linked to Transaction   | 50-200 | <recent times>
-- Orphaned (Not Linked)   | 0-100  | <old times before 1:07 PM>

-- If "Orphaned" count is high and newest_timestamp is recent:
-- ❌ MeterValues still not being linked despite fix

-- ============================================================================
-- 3. Verify MeterValues for active transaction
-- ============================================================================
WITH active_tx AS (
  SELECT id, "transactionId", "startTime"
  FROM "Transactions"
  WHERE "stationId" = 'WALLBOX-HOME-001'
    AND "isActive" = true
  LIMIT 1
)
SELECT
  mv.id,
  mv.timestamp,
  mv."createdAt",
  mv."sampledValue"::jsonb -> 0 ->> 'value' as energy_value,
  mv."sampledValue"::jsonb -> 0 ->> 'unit' as energy_unit,
  EXTRACT(EPOCH FROM (mv.timestamp - t."startTime")) / 60 as minutes_since_start
FROM "MeterValues" mv
JOIN active_tx t ON mv."transactionDatabaseId" = t.id
ORDER BY mv.timestamp ASC;

-- Expected:
-- - Multiple MeterValues records (one per reporting interval, ~5-30 seconds)
-- - energy_value incrementing over time
-- - minutes_since_start increasing chronologically
-- - If empty: No active transaction OR MeterValues not linked

-- ============================================================================
-- 4. Calculate session energy for Live Stats validation
-- ============================================================================
WITH active_tx AS (
  SELECT id, "transactionId", "startTime"
  FROM "Transactions"
  WHERE "stationId" = 'WALLBOX-HOME-001'
    AND "isActive" = true
  LIMIT 1
),
meter_data AS (
  SELECT
    mv.timestamp,
    (mv."sampledValue"::jsonb -> 0 ->> 'value')::numeric as energy_wh,
    ROW_NUMBER() OVER (ORDER BY mv.timestamp ASC) as rn
  FROM "MeterValues" mv
  JOIN active_tx t ON mv."transactionDatabaseId" = t.id
  WHERE mv."sampledValue"::jsonb -> 0 ->> 'measurand' ILIKE '%Energy%'
)
SELECT
  (SELECT energy_wh FROM meter_data WHERE rn = 1) as first_reading_wh,
  (SELECT energy_wh FROM meter_data ORDER BY timestamp DESC LIMIT 1) as latest_reading_wh,
  ((SELECT energy_wh FROM meter_data ORDER BY timestamp DESC LIMIT 1) -
   (SELECT energy_wh FROM meter_data WHERE rn = 1)) as session_energy_wh,
  ((SELECT energy_wh FROM meter_data ORDER BY timestamp DESC LIMIT 1) -
   (SELECT energy_wh FROM meter_data WHERE rn = 1)) / 1000.0 as session_energy_kwh,
  (SELECT COUNT(*) FROM meter_data) as total_meter_values;

-- Expected:
-- session_energy_kwh should match "Energy Delivered" on Live Stats page
-- If different: Frontend calculation issue OR query logic mismatch

-- ============================================================================
-- 5. Check MeterValues frequency (should be every 5-30 seconds)
-- ============================================================================
WITH time_diffs AS (
  SELECT
    timestamp,
    LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp,
    EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp))) as seconds_between
  FROM "MeterValues"
  WHERE "connectorId" IN (
    SELECT "connectorId" FROM "Connectors" WHERE "stationId" = 'WALLBOX-HOME-001'
  )
  AND timestamp > NOW() - INTERVAL '1 hour'
)
SELECT
  MIN(seconds_between) as min_interval_seconds,
  AVG(seconds_between) as avg_interval_seconds,
  MAX(seconds_between) as max_interval_seconds,
  COUNT(*) as total_intervals,
  CASE
    WHEN AVG(seconds_between) BETWEEN 5 AND 30 THEN '✅ Normal (5-30s)'
    WHEN AVG(seconds_between) > 30 THEN '⚠️ Slow (>30s)'
    WHEN AVG(seconds_between) < 5 THEN '⚠️ Very Fast (<5s)'
    ELSE '❓ Unknown'
  END as interval_status
FROM time_diffs
WHERE seconds_between IS NOT NULL;

-- Expected:
-- avg_interval_seconds: 5-30 (typical OCPP reporting interval)
-- interval_status: "✅ Normal (5-30s)"

-- ============================================================================
-- 6. Find transaction-MeterValues mismatches
-- ============================================================================
SELECT
  t.id as transaction_db_id,
  t."transactionId" as tx_id,
  t."isActive",
  COUNT(mv.id) as linked_meter_values,
  MAX(mv.timestamp) as latest_meter_value_timestamp,
  EXTRACT(EPOCH FROM (NOW() - MAX(mv.timestamp))) / 60 as minutes_since_last_data,
  CASE
    WHEN COUNT(mv.id) = 0 THEN '❌ NO METER VALUES'
    WHEN EXTRACT(EPOCH FROM (NOW() - MAX(mv.timestamp))) > 5 THEN '⚠️ STALE DATA'
    ELSE '✅ RECEIVING DATA'
  END as data_status
FROM "Transactions" t
LEFT JOIN "MeterValues" mv ON mv."transactionDatabaseId" = t.id
WHERE t."stationId" = 'WALLBOX-HOME-001'
  AND t."createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY t.id, t."transactionId", t."isActive"
ORDER BY t."createdAt" DESC;

-- Expected for active transaction:
-- data_status = "✅ RECEIVING DATA"
-- linked_meter_values > 10 (depends on session duration)
-- minutes_since_last_data < 1 (if vehicle actively charging)

-- If "❌ NO METER VALUES": MeterValues not being linked at all
-- If "⚠️ STALE DATA": MeterValues stopped being sent OR linking broke

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*
✅ SUCCESS PATTERN (Phase 3 PASSED):
Query 1: All recent MeterValues show "✅ LINKED"
Query 2: "Orphaned" count is 0 or decreasing, newest orphan is old
Query 3: Multiple MeterValues for active transaction
Query 4: session_energy_kwh matches Live Stats display
Query 5: avg_interval_seconds = 5-30, status "Normal"
Query 6: Active transaction shows "✅ RECEIVING DATA"

❌ FAILURE PATTERNS:

Pattern A: MeterValues arriving but not linking
- Query 1: Recent records show "❌ ORPHANED"
- Query 2: High orphan count, newest_timestamp is recent
- Query 6: "❌ NO METER VALUES" despite OCPP logs showing MeterValues
- Root Cause: Transaction lookup failing in MeterValues handler
- Fix: Check transaction ID type mismatch (string vs number)

Pattern B: MeterValues stopped arriving
- Query 1: No recent MeterValues (all timestamps >10 minutes old)
- Query 5: No data or very slow intervals
- Query 6: "⚠️ STALE DATA"
- Root Cause: OCPP connection dropped OR charger stopped sending
- Fix: Check OCPP connection status, verify charger settings

Pattern C: Live Stats showing wrong energy value
- Query 4: session_energy_kwh different from Live Stats display
- Query 3: Data exists but calculation mismatch
- Root Cause: Frontend using cumulative instead of session-specific
- Fix: Already implemented in charging.station.live.stats.tsx

Pattern D: No active transaction found
- Query 3, 4, 6: Empty results
- Root Cause: Transaction not created OR marked inactive
- Fix: Re-run Phase 2 to verify authorization working
*/
