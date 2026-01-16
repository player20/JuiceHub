# PHASE 5: Frontend Functionality Verification

## Objective
Verify all UI pages load correctly without GraphQL errors after the deployment.

---

## Test Environment Setup

**Browser**: Chrome/Firefox/Safari (latest version)
**URL**: https://juicehub-ui.onrender.com
**Login**: Use credentials from Hasura/Supabase auth

**Before Testing**:
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Clear console
4. Enable "Preserve log" to capture all errors

---

## Page-by-Page Verification

### 1. Overview Page (/overview)

**Test Steps**:
1. Navigate to `/overview` or click **Overview** in sidebar
2. Wait for page to fully load (3-5 seconds)
3. Check for GraphQL errors in console
4. Verify all sections render

**Expected Results**:
- ✅ **Usage Snapshots Chart**: 7-day trend chart displays (was broken before)
- ✅ **Network Summary Cards**: Show total stations, active stations, connectors
- ✅ **Recent Activity**: Recent transactions or events listed
- ✅ **No Console Errors**: No "expecting a value for non-nullable variable" errors

**Success Criteria**:
```
✅ Page loads in <5 seconds
✅ Usage Snapshots chart renders without error
✅ GraphQL query succeeds (check Network tab → graphql)
✅ Data displays correctly (not all zeros)
✅ No React errors in console
```

**Failure Indicators**:
- ❌ Error: "expecting a value for non-nullable variable: startDate"
  - **Cause**: `gqlVariables` fix not deployed to UI service
  - **Action**: Force rebuild of OperatorUI

- ❌ Chart shows "No data available"
  - **Cause**: `usage_snapshots` table empty OR not tracked in Hasura
  - **Action**: Check Hasura console → Data → usage_snapshots table

---

### 2. Charging Stations Page (/charging-stations)

**Test Steps**:
1. Navigate to `/charging-stations`
2. Wait for station list to load
3. Check console for errors
4. Verify station card displays

**Expected Results**:
- ✅ **Station List**: WALLBOX-HOME-001 appears
- ✅ **Status Badge**: Shows "Available", "Charging", or "Unavailable"
- ✅ **Connection Status**: Online/Offline indicator
- ✅ **Quick Stats**: Connector count, last heartbeat time

**Success Criteria**:
```
✅ Stations load and display
✅ Status reflects actual charger state
✅ Can click on station card
✅ No GraphQL errors
```

**Failure Indicators**:
- ❌ Status shows "Unavailable" but charger is online
  - **Cause**: StatusNotification not being processed
  - **Action**: Check OCPP logs for StatusNotification messages

---

### 3. Charging Station Detail Page (/charging-stations/[id])

**Test Steps**:
1. Click on **WALLBOX-HOME-001** station card
2. Wait for detail page to load
3. Check all tabs: **Overview**, **Transactions**, **Live Stats**, **Connectors**

#### Tab 3.1: Overview Tab

**Expected Results**:
- ✅ Station name: WALLBOX-HOME-001
- ✅ Model info: Wallbox Pulsar Plus (or configured model)
- ✅ Firmware version
- ✅ Last heartbeat timestamp (should be recent, <5 minutes)
- ✅ Connector status cards

**Success Criteria**:
```
✅ Station details display correctly
✅ Heartbeat timestamp is recent
✅ Connector states match OCPP logs
```

#### Tab 3.2: Transactions Tab

**Expected Results**:
- ✅ Transaction list displays
- ✅ Active transactions highlighted (green badge)
- ✅ Transaction ID, start time, energy, duration shown
- ✅ Can click "Stop Transaction" button for active sessions

**Success Criteria**:
```
✅ Transaction list loads
✅ Active transaction visible if charging
✅ Historical transactions show correct data
✅ Stop Transaction button works (if tested)
```

**Failure Indicators**:
- ❌ "No active charging sessions" but vehicle is plugged in
  - **Cause**: Transaction not created OR isActive = false
  - **Action**: Run verify-authorization-fix.sql (Phase 2)

#### Tab 3.3: Live Stats Tab ⭐ **CRITICAL TEST**

**Test Steps**:
1. **Ensure vehicle is plugged in and charging**
2. Click **Live Stats** tab
3. Wait 3 seconds for data to load
4. Verify real-time updates (page refreshes every 10 seconds)

**Expected Results**:
- ✅ **Session Card**: Shows "Connector 1 [CHARGING]"
- ✅ **Energy Delivered**: Incrementing value (e.g., 1.23 kWh)
- ✅ **Current Power**: Non-zero value (e.g., 7.2 kW)
- ✅ **Session Duration**: Counting up (e.g., "15m")
- ✅ **Battery Level**: Percentage if available (e.g., 45%)
- ✅ **Detailed Metrics**:
  - Session Start time
  - Authorization: NoAuthorization
  - Voltage: ~240V (US) or ~220V (EU)
  - Current: ~30A
  - Meter Values Received: >10
- ✅ **Last Data Update**: Shows "a few seconds ago" (NOT "14 hours ago")
- ✅ **Auto-refresh**: Values update automatically every 10 seconds

**Success Criteria**:
```
✅ Live Stats tab shows active session (NOT empty state)
✅ Energy Delivered incrementing in real-time
✅ Current Power showing non-zero value
✅ Session Duration counting up
✅ "Last Data Update" timestamp is recent (<30 seconds)
✅ Auto-refresh working (Last update time resets to "just now")
✅ Estimated Cost calculated correctly (~$0.30/kWh)
✅ CO₂ Avoided calculation displays
```

**Failure Indicators**:
- ❌ Shows "No active charging sessions" despite vehicle plugged in
  - **Root Cause**: Transaction not created (Phase 2 failed)
  - **Action**: Check authorization flow

- ❌ Energy Delivered stuck at 0.00 kWh
  - **Root Cause**: MeterValues not linked (Phase 3 failed)
  - **Action**: Run verify-metervalues-live-stats.sql

- ❌ "Last Data Update: 14 hours ago"
  - **Root Cause**: MeterValues not being saved OR linking broke
  - **Action**: Check OCPP logs for MeterValues messages

- ❌ Energy value resets to 0 on refresh
  - **Root Cause**: Not using first MeterValue as baseline
  - **Action**: Check charging.station.live.stats.tsx:157-164 logic

#### Tab 3.4: Connectors Tab

**Expected Results**:
- ✅ Connector list displays (e.g., Connector 1)
- ✅ Status: Available, Preparing, Charging, Finishing
- ✅ EVSE ID shown
- ✅ Supported standards (e.g., IEC62196Type1, CCS)

**Success Criteria**:
```
✅ Connector details load
✅ Status matches StatusNotification in OCPP logs
```

---

### 4. Authorizations Page (/authorizations)

**Test Steps**:
1. Navigate to `/authorizations`
2. Check if page loads without errors
3. Verify authorization records display

**Expected Results**:
- ✅ Authorization list displays
- ✅ Can create new authorization
- ✅ Can edit existing authorization
- ✅ No GraphQL field errors

**Success Criteria**:
```
✅ Page loads successfully
✅ Authorization CRUD operations work
✅ No "field not found" errors
```

---

### 5. Variable Attributes Page (/variable-attributes)

**Test Steps**:
1. Navigate to `/variable-attributes`
2. Wait for list to load
3. Check console for GraphQL errors

**Expected Results**:
- ✅ Variable attributes list displays
- ✅ **Variable** and **Component** relationships work (was broken before Hasura reload)
- ✅ Can expand rows to see details

**Success Criteria**:
```
✅ Page loads without errors
✅ Variable and Component fields populated
✅ No "field 'Variable' not found in type: 'VariableAttributes'" error
```

**Failure Indicators**:
- ❌ Error: "field 'Variable' not found"
  - **Cause**: Hasura metadata not reloaded after schema changes
  - **Action**: Reload Hasura metadata (user already did this)

---

### 6. OCPP Logs Page (/ocpp-logs)

**Test Steps**:
1. Navigate to `/ocpp-logs` or similar diagnostics page
2. Verify recent OCPP messages display
3. Check for StartTransaction, MeterValues, Heartbeat messages

**Expected Results**:
- ✅ OCPP message log displays
- ✅ Recent messages (last 5 minutes) visible
- ✅ Can filter by message type
- ✅ Can search by station ID

**Success Criteria**:
```
✅ Logs load and display
✅ Timestamps are recent
✅ Can see full message payloads
```

---

## GraphQL Error Detection

### Console Errors to Watch For

**Error 1: Missing Field**
```
Error: field 'Variable' not found in type: 'VariableAttributes'
```
- **Page Affected**: Variable Attributes
- **Cause**: Hasura metadata out of sync
- **Status**: Should be fixed (user reloaded metadata)

**Error 2: Missing Variable**
```
expecting a value for non-nullable variable: "startDate"
```
- **Page Affected**: Overview (Usage Snapshots)
- **Cause**: Using `variables` instead of `gqlVariables`
- **Status**: Fixed in commit f463a28, should be deployed

**Error 3: Unauthorized**
```
GraphQL error: Could not verify JWT: JWSError
```
- **Page Affected**: All pages
- **Cause**: Authentication token expired or invalid
- **Action**: Log out and log back in

**Error 4: Subscription Failed**
```
WebSocket connection failed
```
- **Page Affected**: Pages with real-time subscriptions
- **Cause**: Hasura WebSocket endpoint unreachable
- **Action**: Check Hasura service health

---

## Performance Benchmarks

| Page | Load Time | Success Criteria |
|------|-----------|------------------|
| Overview | <5s | First Contentful Paint <3s |
| Charging Stations List | <3s | Stations render <2s |
| Station Detail | <4s | All tabs load <3s |
| Live Stats | <2s | Initial data <1s, refresh <200ms |
| Authorizations | <3s | List loads <2s |
| Variable Attributes | <4s | List loads <3s |
| OCPP Logs | <5s | Recent messages <3s |

**Measurement**: Use Chrome DevTools → Performance tab → Reload page → Check "Load" time

---

## Browser Network Tab Verification

### GraphQL Requests to Check

1. **GetUsageSnapshots** (Overview page)
   - Status: 200 OK
   - Response contains `usage_snapshots` array
   - No errors in response

2. **GetChargingStations** (Stations page)
   - Status: 200 OK
   - Response contains `ChargingStations` array

3. **GetTransactions** (Live Stats)
   - Status: 200 OK
   - Response contains active transaction if charging

4. **GetMeterValues** (Live Stats)
   - Status: 200 OK
   - Response contains recent MeterValues with `sampledValue` data

---

## Mobile Responsiveness (Optional)

**Test on mobile viewport**:
1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Select "iPhone 12 Pro" or "iPad"
3. Navigate through pages
4. Verify layout doesn't break

---

## Final Frontend Checklist

- [ ] Overview page loads without errors
- [ ] Usage Snapshots chart displays (GraphQL fix working)
- [ ] Charging Stations list displays
- [ ] Station detail page loads all tabs
- [ ] **Live Stats shows real-time charging data** (CRITICAL)
- [ ] Transactions tab shows active sessions
- [ ] Authorizations page accessible
- [ ] Variable Attributes page loads (relationships working)
- [ ] OCPP Logs page displays recent messages
- [ ] No console errors across any page
- [ ] Performance benchmarks met (<5s load times)
- [ ] Stop Transaction button works (if tested)

---

## Next Steps

**If Phase 5 PASSED** (all checks ✅):
→ Proceed to **Phase 6: OCPP Protocol Compliance**

**If Phase 5 FAILED** (any check ❌):
→ Document specific failures
→ Check if fix was deployed (verify build logs)
→ Re-deploy if needed
→ Re-run Phase 5 verification
