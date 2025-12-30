-- Verify Performance Indexes
-- Run this after applying add-performance-indexes.sql to verify everything worked

\timing on

-- 1. List all custom indexes we created
\echo ''
\echo '=========================================='
\echo 'Custom Indexes Created'
\echo '=========================================='
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 2. Verify authorization index works
\echo ''
\echo '=========================================='
\echo 'Test 1: Authorization Lookup'
\echo '=========================================='
EXPLAIN ANALYZE
SELECT * FROM "Authorizations"
WHERE "idToken" = 'GUEST-001' AND "tenantId" = 1 AND "status" = 'Accepted';

-- Expected: Should use idx_authorizations_idtoken_tenant
-- Expected execution time: < 5ms

-- 3. Verify active transaction lookup
\echo ''
\echo '=========================================='
\echo 'Test 2: Active Transaction Lookup'
\echo '=========================================='
EXPLAIN ANALYZE
SELECT * FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001' AND "isActive" = true;

-- Expected: Should use idx_transactions_active_station
-- Expected execution time: < 10ms

-- 4. Verify recent OCPP message lookup
\echo ''
\echo '=========================================='
\echo 'Test 3: Latest Heartbeat Lookup'
\echo '=========================================='
EXPLAIN ANALYZE
SELECT * FROM "OCPPMessages"
WHERE "stationId" = 'WALLBOX-HOME-001' AND "action" = 'Heartbeat'
ORDER BY "createdAt" DESC
LIMIT 1;

-- Expected: Should use idx_ocpp_messages_station_action_created
-- Expected execution time: < 10ms

-- 5. Verify transaction history query
\echo ''
\echo '=========================================='
\echo 'Test 4: Transaction History'
\echo '=========================================='
EXPLAIN ANALYZE
SELECT * FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
ORDER BY "stopTime" DESC NULLS LAST
LIMIT 10;

-- Expected: Should use idx_transactions_station_stoptime
-- Expected execution time: < 20ms

-- 6. Check for unused indexes (optional - helps identify if indexes aren't being used)
\echo ''
\echo '=========================================='
\echo 'Index Usage Statistics'
\echo '=========================================='
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY index_scans ASC;

-- Low idx_scan counts mean the index isn't being used much
-- This is expected initially - scans will increase with app usage

-- 7. Check table sizes
\echo ''
\echo '=========================================='
\echo 'Table Sizes (with indexes)'
\echo '=========================================='
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('Authorizations', 'Transactions', 'OCPPMessages', 'ChargingStations', 'Connectors', 'Reservations')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''
\echo '=========================================='
\echo 'Verification Complete!'
\echo '=========================================='
\echo 'Next steps:'
\echo '1. Check that all expected indexes are listed'
\echo '2. Verify EXPLAIN ANALYZE shows index usage (not Seq Scan)'
\echo '3. Monitor query performance improvements in production'
\echo ''
