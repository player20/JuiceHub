# CRITICAL: Fix Charging Session Initialization
**Date**: January 7, 2026
**Priority**: URGENT - Blocking all charging functionality

---

## 🚨 Problem Summary

**Vehicle IS charging (energy flowing) BUT system cannot track it because:**
1. Charger never sent StartTransaction message
2. All MeterValues have transactionId=0 (invalid)
3. No transaction record in database
4. Live Stats shows "No active charging sessions"

**Root Cause**: Wallbox firmware bypassed OCPP protocol OR old transaction (ID=1 from Jan 5) still cached in charger.

---

## ✅ IMMEDIATE FIX (5 minutes)

### Power Cycle the Charger

**Via Wallbox Mobile App**:

1. **Open Wallbox app** on your phone
2. **Find your charger**: WALLBOX-HOME-001
3. **Reboot charger**:
   - Tap on charger
   - Look for "Reboot", "Restart", or "Power Cycle" option
   - Confirm restart
4. **Wait 60 seconds** for full restart
5. **Unplug vehicle** from charger
6. **Wait 30 seconds** (important - let charger fully reset)
7. **Plug vehicle back in**

**Via Charger Physical Controls** (if app unavailable):
1. Locate circuit breaker for charger
2. Turn OFF circuit breaker
3. Wait 30 seconds
4. Turn ON circuit breaker
5. Wait 60 seconds for boot
6. Unplug vehicle
7. Wait 30 seconds
8. Plug vehicle back in

---

## 🔍 Verify the Fix

### Check Render Logs (Immediately after plugging in)

1. **Go to**: https://dashboard.render.com
2. **Navigate to**: juicehub-core service → Logs
3. **Search for**: `StartTransaction` (within last 5 minutes)

**Expected SUCCESS Pattern**:
```json
{
  "action": "StartTransaction",
  "payload": {
    "idTag": "NoAuthorization",
    "connectorId": 1 or 2,
    "meterStart": <number>,
    "timestamp": "2026-01-07T..."
  }
}

[DEBUG] authorizeOcpp16IdToken called: stationId=WALLBOX-HOME-001, idToken="NoAuthorization"
Auto-accepting NoAuthorization token for station WALLBOX-HOME-001

{
  "idTagInfo": {
    "status": "Accepted"  // ✅ NOT "Invalid"
  },
  "transactionId": 3  // ✅ Positive number, NOT 0
}
```

**If you see this** → ✅ **FIX SUCCESSFUL!**

**Expected FAILURE Pattern** (if still broken):
```
MeterValues received: transactionId=0
Skipping MeterValues: missing transactionId
```

**If you see this** → ⚠️ **Proceed to Alternative Fix**

---

## 🔄 Alternative Fix: Manual Transaction Cleanup

**Only if power cycle didn't work**

### Step 1: Verify Old Transaction Status

**Run in Supabase SQL Editor**:
```sql
-- Check current transactions
SELECT
  id,
  "transactionId",
  "isActive",
  "startTime",
  "endTime",
  "createdAt"
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Look for**:
- Transaction with `isActive = true` (shouldn't exist if properly ended)
- Transaction with `transactionId = "1"` from Jan 5

### Step 2: Check OCPP Logs for StopTransaction

**Search Render Logs**:
1. Go to juicehub-core → Logs
2. Search: `StopTransaction`
3. Date range: Jan 5-6

**If StopTransaction found** → Transaction was properly ended, charger has cached state (power cycle should fix)

**If StopTransaction NOT found** → Transaction never stopped (manual cleanup needed)

### Step 3: Manual Cleanup (if needed)

```sql
-- Force end the old transaction
UPDATE "Transactions"
SET
  "isActive" = false,
  "endTime" = NOW(),
  "endReason" = 'Manual cleanup - stale transaction'
WHERE id = 2
  AND "transactionId" = '1'
  AND "stationId" = 'WALLBOX-HOME-001';

-- Verify
SELECT * FROM "Transactions" WHERE id = 2;
```

**Then**: Unplug vehicle, wait 30 seconds, plug back in

---

## 📊 Verify Charging is Working

### Check Database for New Transaction

**Run in Supabase**:
```sql
-- Should see NEW transaction created in last 5 minutes
SELECT
  id,
  "transactionId",
  "isActive",
  "startTime",
  "createdAt",
  authorization
FROM "Transactions"
WHERE "stationId" = 'WALLBOX-HOME-001'
  AND "createdAt" > NOW() - INTERVAL '10 minutes'
ORDER BY "createdAt" DESC;
```

**Expected**:
```
id | transactionId | isActive | startTime           | authorization
---|---------------|----------|---------------------|------------------
3  | "2"           | true     | 2026-01-07 08:XX:XX | {"idToken": "NoAuthorization"}
```

### Check MeterValues Being Linked

```sql
-- Should see MeterValues with valid transactionDatabaseId
SELECT
  id,
  "transactionDatabaseId",
  "transactionId",
  timestamp,
  "sampledValue"
FROM "MeterValues"
WHERE "connectorId" IN (
  SELECT "connectorId" FROM "Connectors"
  WHERE "stationId" = 'WALLBOX-HOME-001'
)
  AND timestamp > NOW() - INTERVAL '10 minutes'
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected**:
- `transactionDatabaseId` is NOT NULL (e.g., 3)
- `transactionId` matches new transaction (e.g., "2")
- `sampledValue` contains energy data

### Check Live Stats

1. **Go to**: https://juicehub-ui.onrender.com
2. **Navigate to**: Charging Stations → WALLBOX-HOME-001
3. **Click**: Live Stats tab

**Expected**:
```
Connector 1                    [CHARGING]
Session ID: 2

Energy Delivered:    X.XX kWh  ⚡
Current Power:       X.XX kW   ⚡
Session Duration:    X min     ⏱️

Last Data Update: Just now
```

**If still shows "No active charging sessions"** → Check browser console for errors

---

## 🔧 Troubleshooting

### Power Cycle Didn't Work

**Possible causes**:
1. Charger firmware has bug preventing proper OCPP sequence
2. Old transaction truly stuck in charger memory
3. Wallbox cloud service caching old state

**Next steps**:
1. Try manual transaction cleanup (Step 3 above)
2. Factory reset charger (via Wallbox app settings)
3. Contact Wallbox support about firmware update

### StartTransaction Shows "Invalid" Status

**Check logs for**:
```
{
  "idTagInfo": {
    "status": "Invalid"  // ❌ BAD
  },
  "transactionId": 0
}
```

**If you see this**:
1. NoAuthorization auto-accept NOT working
2. Check deployment: `git log --oneline | head -5`
3. Verify commit 9e331e5 is deployed
4. Check Render build logs for errors

### MeterValues Still Have transactionId=0

**Possible causes**:
1. StartTransaction succeeded but returned transactionId=0
2. Charger firmware bug sending wrong transactionId
3. Multiple chargers using same ID

**Next steps**:
1. Check StartTransaction response in logs
2. Verify transactionId in response matches what MeterValues send
3. Check if connector 1 vs 2 issue

---

## ✅ Success Criteria

After fix is applied, you should see:

- [x] StartTransaction message in Render logs
- [x] Response status "Accepted" (not "Invalid")
- [x] transactionId is positive number (not 0)
- [x] New transaction record in database with isActive=true
- [x] MeterValues have valid transactionDatabaseId (not NULL)
- [x] Live Stats shows real-time charging data
- [x] Energy Delivered incrementing
- [x] "Last Data Update: Just now"

---

## 📞 If Nothing Works

**Contact Support With**:
1. Screenshots of Render logs showing StartTransaction attempts
2. Screenshot of MeterValues with transactionId=0
3. Database query results (Transactions and MeterValues)
4. Wallbox charger model and firmware version
5. Screenshot of Live Stats page showing "No active sessions"

**Critical Info to Include**:
- Charger ID: WALLBOX-HOME-001
- Connector: 1 or 2 (check which vehicle is plugged into)
- Old transaction ID: 1 (from Jan 5)
- New transaction attempts: Check logs for timestamps

---

**Last Updated**: January 7, 2026 1:00 AM PST
**Status**: URGENT - Blocking charging functionality
**Estimated Fix Time**: 5-15 minutes
