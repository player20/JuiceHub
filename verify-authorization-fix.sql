-- PHASE 2: Authorization Flow Verification
-- Run in Supabase SQL Editor to verify NoAuthorization fix is working

-- ============================================================================
-- 1. Check for recent transactions (should exist if fix is working)
-- ============================================================================
SELECT
  id,
  "stationId",
  "transactionId",
  "connectorId",
  "isActive",
  "startTime",
  "endTime",
  "createdAt",
  authorization -> 'idToken' as id_token
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
  AND "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Expected: Transactions with idToken = "NoAuthorization" created recently
-- If empty: Fix not working OR no charging attempts made

-- ============================================================================
-- 2. Check active transactions
-- ============================================================================
SELECT
  id,
  "transactionId",
  "connectorId",
  "isActive",
  "startTime",
  authorization -> 'idToken' as id_token,
  NOW() - "startTime" as session_duration
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
  AND "isActive" = true;

-- Expected: Active transaction if vehicle is currently plugged in
-- Expected idToken: "NoAuthorization" (if using auto-accept)

-- ============================================================================
-- 3. Check authorization records (should NOT be required for NoAuthorization)
-- ============================================================================
SELECT
  id,
  "idToken",
  "type",
  "status",
  "createdAt"
FROM "Authorizations"
WHERE "idToken" = 'NoAuthorization'
ORDER BY "createdAt" DESC
LIMIT 5;

-- Expected: May be empty (auto-accept should work without record)
-- If exists: User created manual workaround during demo

-- ============================================================================
-- 4. Verify transaction was accepted (not rejected)
-- ============================================================================
-- Check that recent transactions have valid transactionId (not "0")
SELECT
  id,
  "transactionId",
  "stationId",
  "connectorId",
  "createdAt",
  CASE
    WHEN "transactionId" = '0' THEN '❌ REJECTED'
    WHEN "transactionId" IS NULL THEN '❌ NULL'
    ELSE '✅ ACCEPTED'
  END as status
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
  AND "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Expected: All transactions show "✅ ACCEPTED"
-- If "❌ REJECTED": Authorization still failing

-- ============================================================================
-- 5. Count successful vs failed authorizations (last 24 hours)
-- ============================================================================
SELECT
  CASE
    WHEN "transactionId" != '0' AND "transactionId" IS NOT NULL THEN 'Success'
    ELSE 'Failed'
  END as auth_result,
  COUNT(*) as count,
  ARRAY_AGG(authorization -> 'idToken') as id_tokens_used
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
  AND "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY auth_result;

-- Expected:
-- Success | N | ["NoAuthorization", ...]
-- Failed  | 0 | []

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*
✅ SUCCESS PATTERN:
- Recent transactions exist with createdAt after Jan 6, 2026 1:07 PM
- transactionId is a positive number (not "0" or NULL)
- idToken is "NoAuthorization"
- isActive = true if vehicle currently charging

❌ FAILURE PATTERNS:

Pattern A: No transactions created
- Symptom: Empty result set
- Cause: StartTransaction not being called OR rejected before transaction creation
- Action: Check OCPP logs for StartTransaction messages

Pattern B: Transactions created but transactionId = "0"
- Symptom: transactionId column shows "0"
- Cause: Authorization rejected, transaction created with invalid ID
- Action: Check authorization logic in TransactionService.ts

Pattern C: Transactions exist but all old (before deployment)
- Symptom: All createdAt timestamps before Jan 6, 2026 1:07 PM
- Cause: Deployment failed OR no new charging attempts made
- Action: Verify deployment in Render dashboard

Pattern D: Only manual "NoAuthorization" records work
- Symptom: Transactions only succeed when Authorization record exists
- Cause: Auto-accept code not executing
- Action: Check diagnostic logs for "[DEBUG] authorizeOcpp16IdToken"
*/
