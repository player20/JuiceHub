-- PHASE 4: Database Integrity Audit (Historical Data)
-- Run in Supabase SQL Editor
-- Objective: Verify database integrity using past data while Phase 2 is blocked

-- ============================================================================
-- 1. Overview: All Transactions (7-day history)
-- ============================================================================
SELECT
  id,
  "transactionId",
  "stationId",
  "connectorId",
  "isActive",
  "startTime",
  "endTime",
  "createdAt",
  CASE
    WHEN "transactionId" = '0' THEN '❌ REJECTED'
    WHEN "transactionId" IS NULL THEN '❌ NULL'
    WHEN "isActive" = true THEN '🟢 ACTIVE'
    ELSE '✅ COMPLETED'
  END as status
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- Expected: See transaction history, identify any with transactionId="0" (rejected)

-- ============================================================================
-- 2. Count Orphaned MeterValues (7-day history)
-- ============================================================================
SELECT
  CASE
    WHEN "transactionDatabaseId" IS NULL THEN 'Orphaned (Not Linked)'
    ELSE 'Linked to Transaction'
  END as link_status,
  COUNT(*) as count,
  MIN(timestamp) as oldest,
  MAX(timestamp) as newest,
  EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 3600 as time_span_hours
FROM "MeterValues"
WHERE "connectorId" IN (
  SELECT "connectorId" FROM "Connectors" WHERE "stationId" = 'WALLBOX-HOME-001'
)
AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY link_status
ORDER BY link_status;

-- Expected Pattern (if past sessions worked):
-- Linked to Transaction   | 500-5000 | <7 days ago> | <recent>
-- Orphaned (Not Linked)   | 0-100    | <old times>

-- If high orphan count with recent timestamps → MeterValues linking broken historically

-- ============================================================================
-- 3. Transaction-MeterValues Linking Analysis (Past 7 days)
-- ============================================================================
SELECT
  t.id as transaction_db_id,
  t."transactionId" as tx_id,
  t."isActive",
  t."startTime",
  t."endTime",
  COUNT(mv.id) as meter_values_count,
  MIN(mv.timestamp) as first_meter_value,
  MAX(mv.timestamp) as last_meter_value,
  EXTRACT(EPOCH FROM (MAX(mv.timestamp) - MIN(mv.timestamp))) / 60 as session_duration_minutes,
  CASE
    WHEN COUNT(mv.id) = 0 THEN '❌ NO METERVALUES'
    WHEN COUNT(mv.id) < 10 THEN '⚠️ FEW METERVALUES'
    ELSE '✅ NORMAL'
  END as data_quality
FROM "Transactions" t
LEFT JOIN "MeterValues" mv ON mv."transactionDatabaseId" = t.id
WHERE t."stationId" = 'WALLBOX-HOME-001'
  AND t."createdAt" > NOW() - INTERVAL '7 days'
  AND t."transactionId" != '0'  -- Exclude rejected transactions
GROUP BY t.id, t."transactionId", t."isActive", t."startTime", t."endTime"
ORDER BY t."startTime" DESC;

-- Expected: Each past transaction should have multiple MeterValues
-- If data_quality = "❌ NO METERVALUES" → Linking never worked
-- If data_quality = "⚠️ FEW METERVALUES" → Short session or sparse reporting

-- ============================================================================
-- 4. Identify Specific Stale Transaction (Transaction ID=1)
-- ============================================================================
SELECT
  t.id as db_id,
  t."transactionId",
  t."connectorId",
  t."isActive",
  t."startTime",
  t."endTime",
  t."createdAt",
  t."updatedAt",
  COUNT(mv.id) as associated_metervalues,
  MAX(mv.timestamp) as last_metervalue_time,
  EXTRACT(EPOCH FROM (NOW() - t."startTime")) / 3600 as hours_since_start,
  CASE
    WHEN t."endTime" IS NULL AND t."isActive" = false THEN '⚠️ ENDED BUT NO ENDTIME'
    WHEN t."endTime" IS NULL AND t."isActive" = true THEN '❌ STILL ACTIVE (STALE)'
    WHEN t."endTime" IS NOT NULL THEN '✅ PROPERLY ENDED'
  END as completion_status
FROM "Transactions" t
LEFT JOIN "MeterValues" mv ON mv."transactionDatabaseId" = t.id
WHERE t."stationId" = 'WALLBOX-HOME-001'
  AND t."transactionId" = '1'  -- The stale transaction from Jan 5
GROUP BY t.id, t."transactionId", t."connectorId", t."isActive", t."startTime", t."endTime", t."createdAt", t."updatedAt";

-- Expected for Transaction ID=1:
-- - isActive = false (already ended in database)
-- - endTime should be set (if StopTransaction was received)
-- - If endTime IS NULL but isActive=false → Ended abnormally

-- ============================================================================
-- 5. Check All Transactions for Completion Patterns
-- ============================================================================
SELECT
  COUNT(*) as total_transactions,
  SUM(CASE WHEN "transactionId" = '0' THEN 1 ELSE 0 END) as rejected_count,
  SUM(CASE WHEN "isActive" = true THEN 1 ELSE 0 END) as active_count,
  SUM(CASE WHEN "isActive" = false AND "endTime" IS NULL THEN 1 ELSE 0 END) as ended_no_time_count,
  SUM(CASE WHEN "isActive" = false AND "endTime" IS NOT NULL THEN 1 ELSE 0 END) as properly_ended_count,
  ROUND(
    100.0 * SUM(CASE WHEN "isActive" = false AND "endTime" IS NOT NULL THEN 1 ELSE 0 END) /
    NULLIF(COUNT(*), 0),
    2
  ) as proper_completion_percentage
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
  AND "createdAt" > NOW() - INTERVAL '7 days';

-- Expected healthy system:
-- rejected_count: 0 (no authorization failures)
-- active_count: 0-1 (at most one active session)
-- proper_completion_percentage: >90% (most sessions end cleanly)

-- ============================================================================
-- 6. MeterValues Frequency Analysis
-- ============================================================================
WITH time_diffs AS (
  SELECT
    id,
    timestamp,
    LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp,
    EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp))) as seconds_between,
    "transactionDatabaseId"
  FROM "MeterValues"
  WHERE "connectorId" IN (
    SELECT "connectorId" FROM "Connectors" WHERE "stationId" = 'WALLBOX-HOME-001'
  )
  AND timestamp > NOW() - INTERVAL '24 hours'
)
SELECT
  CASE
    WHEN "transactionDatabaseId" IS NULL THEN 'Orphaned'
    ELSE 'Linked'
  END as link_status,
  MIN(seconds_between) as min_interval_sec,
  AVG(seconds_between) as avg_interval_sec,
  MAX(seconds_between) as max_interval_sec,
  COUNT(*) as sample_size,
  CASE
    WHEN AVG(seconds_between) BETWEEN 5 AND 30 THEN '✅ Normal (5-30s)'
    WHEN AVG(seconds_between) > 30 THEN '⚠️ Slow (>30s)'
    WHEN AVG(seconds_between) < 5 THEN '⚠️ Very Fast (<5s)'
    ELSE '❓ Unknown'
  END as interval_health
FROM time_diffs
WHERE seconds_between IS NOT NULL
GROUP BY link_status;

-- Expected: avg_interval_sec 5-30 (typical OCPP MeterValues reporting interval)
-- Charger sends MeterValues every 5-30 seconds during charging

-- ============================================================================
-- 7. Database Constraints and Indexes Check
-- ============================================================================
-- Check if key indexes exist for performance
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Transactions', 'MeterValues', 'Connectors')
ORDER BY tablename, indexname;

-- Expected: Indexes on:
-- Transactions: stationId, transactionId, isActive, createdAt
-- MeterValues: transactionDatabaseId, connectorId, timestamp
-- If missing → Add to improve query performance

-- ============================================================================
-- 8. Foreign Key Integrity
-- ============================================================================
-- Check for orphaned connector references
SELECT
  mv.id as metervalue_id,
  mv."connectorId",
  mv.timestamp,
  c.id as connector_exists
FROM "MeterValues" mv
LEFT JOIN "Connectors" c ON mv."connectorId" = c."connectorId"
WHERE c.id IS NULL
  AND mv.timestamp > NOW() - INTERVAL '24 hours'
LIMIT 10;

-- Expected: Empty result (no orphaned connector references)
-- If rows returned → MeterValues pointing to non-existent connectors

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*
✅ HEALTHY DATABASE PATTERN:
Query 1: All transactions have valid transactionId (not "0")
Query 2: <10% orphaned MeterValues, all from old sessions
Query 3: All transactions have 10+ MeterValues linked
Query 4: Transaction ID=1 has endTime set and isActive=false
Query 5: proper_completion_percentage > 90%
Query 6: avg_interval_sec between 5-30
Query 7: Indexes present on key columns
Query 8: No orphaned connector references

⚠️ WARNING PATTERNS:

Pattern A: High Orphan Rate
- Query 2 shows >50% orphaned MeterValues
- Query 3 shows transactions with "❌ NO METERVALUES"
- Root Cause: MeterValues linking broken (TransactionId lookup failing)
- Action: Check TransactionService MeterValues handler

Pattern B: Stale Active Transaction
- Query 4 shows isActive=true but hours_since_start > 24
- Query 5 shows active_count > 0 for old transaction
- Root Cause: StopTransaction not processed or missing
- Action: Check OCPP logs for StopTransaction messages

Pattern C: Abnormal Completion
- Query 4 shows endTime=NULL but isActive=false
- Query 5 shows high ended_no_time_count
- Root Cause: Transactions ended without StopTransaction message
- Action: Investigate how transactions are being ended

Pattern D: Poor Data Quality
- Query 3 shows many transactions with "⚠️ FEW METERVALUES"
- Query 6 shows avg_interval_sec > 60
- Root Cause: Charger not sending MeterValues frequently OR messages being dropped
- Action: Check charger configuration and OCPP message logs

❌ CRITICAL ISSUES:

Issue 1: All Transactions Rejected
- Query 1 shows all transactionId = "0"
- Query 5 shows rejected_count = total_transactions
- Root Cause: Authorization consistently failing
- Action: URGENT - Check authorization logic

Issue 2: No MeterValues Linking
- Query 2 shows 100% orphaned
- Query 3 shows all transactions "❌ NO METERVALUES"
- Root Cause: Transaction lookup completely broken
- Action: URGENT - Check MeterValues handler and database schema

Issue 3: Missing Indexes
- Query 7 shows no indexes on Transactions or MeterValues
- Root Cause: Database migrations incomplete
- Action: Create indexes to prevent performance degradation
*/
