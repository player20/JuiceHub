# Frontend Errors Fix Guide
**Date**: January 7, 2026 12:00 AM PST
**Commit**: 5058c03 (deployed)

---

## 📋 Summary of Frontend Errors

After deployment, **4 major frontend errors** were identified affecting multiple pages:

| Error # | Location | Issue | Status |
|---------|----------|-------|--------|
| 1 | Overview page (trend cards) | GraphQL variables not passed | ✅ **FIXED** (commit 5058c03) |
| 1b | Analytics Dashboard | GraphQL variables not passed | ✅ **FIXED** (commit 89f7ce2) |
| 1c | Alerts Dashboard | GraphQL variables not passed | ✅ **FIXED** (commit 89f7ce2) |
| 2 | Charging Stations / Variable Attributes pages | Hasura relationships not found | ✅ **WORKING** (needs cache clear) |
| 3 | Locations page | Google Maps API key missing | ⏸️ **SETUP GUIDE CREATED** |
| 4 | Error Logs page | Table doesn't exist in database | ⏸️ **SETUP GUIDE CREATED** |

---

## ✅ ERROR 1: GraphQL Variables - **FIXED**

### Symptom
```
Error (status code: undefined)
expecting a value for non-nullable variable: "today"
```

**Impact**:
- Overview page top stat cards stuck loading (infinite spinner)
- Sessions Today, Energy Delivered, Revenue cards show no data
- 7-Day Usage Trends shows "No data available"

### Root Cause
Incomplete fix from commit f463a28. The `variables` → `gqlVariables` change was only applied to `usage-chart.card.tsx` but missed:
- `sessions-trend.card.tsx`
- `energy-trend.card.tsx`
- `revenue-trend.card.tsx`

### Fix Applied (Commit 5058c03)
Changed all instances of `variables:` to `gqlVariables:` in `useCustom` hooks:

**Before** (BROKEN):
```typescript
const { data } = useCustom({
  meta: {
    operation: 'GetTodayStats',
    variables: { today: today },  // ❌ WRONG
    gqlQuery: GET_TODAY_STATS,
  },
});
```

**After** (FIXED):
```typescript
const { data } = useCustom({
  meta: {
    operation: 'GetTodayStats',
    gqlVariables: { today: today },  // ✅ CORRECT
    gqlQuery: GET_TODAY_STATS,
  },
});
```

### Deployment Status
✅ **Deployed**: Commit 5058c03 pushed to main at 12:00 AM PST
⏳ **Render**: Rebuild in progress (~5-10 minutes)

### Verification Steps
1. Wait for Render build to complete (check https://dashboard.render.com)
2. Open https://juicehub-ui.onrender.com
3. Navigate to **Overview** page
4. **Expected**:
   - ✅ Sessions Today, Energy Delivered, Revenue cards display numbers (not infinite spinner)
   - ✅ 7-Day Usage Trends chart shows data
   - ✅ No GraphQL errors in browser console (F12 → Console tab)

---

## ⏸️ ERROR 2: Variable Attributes - Hasura Metadata Issue

### Symptom
```
Error (status code: undefined)
field 'Variable' not found in type: 'VariableAttributes'
```

**Impact**:
- Charging Stations → Aggregated Meter Values Data tab shows error
- Variable Attributes page inaccessible
- Analytics dashboard broken (if using VariableAttributes queries)

### Root Cause
Hasura GraphQL metadata doesn't recognize the foreign key relationships:
- `VariableAttributes.Variable` (relationship to Variables table)
- `VariableAttributes.Component` (relationship to Components table)

**Why previous reload didn't work**:
User already reloaded metadata earlier, but the error persists. Possible causes:
1. Metadata reload didn't include object relationships
2. Foreign keys don't exist in database
3. Hasura service needs restart
4. Relationships weren't tracked after reload

### Fix Steps (User Action Required)

#### Option A: Reload Metadata with Relationships (Recommended)

1. **Open Hasura Console**:
   - Go to https://juicehub-hasura.onrender.com/console
   - Login with admin secret: `devadmin123`

2. **Navigate to Data → VariableAttributes table**:
   - Click "Data" tab in top menu
   - Select "VariableAttributes" table from left sidebar

3. **Track Relationships**:
   - Click "Relationships" tab
   - Look for "Variable" and "Component" under **Object Relationships**
   - If they show "Untracked", click **"Track"** button for each
   - If they don't appear, click **"Add"** and configure:
     - **Variable relationship**:
       - Name: `Variable`
       - Reference table: `Variables`
       - From: `variableId` → To: `id`
     - **Component relationship**:
       - Name: `Component`
       - Reference table: `Components`
       - From: `componentId` → To: `id`

4. **Reload Metadata**:
   - Click **Settings** (gear icon) in top right
   - Click **"Reload Metadata"** button
   - Wait for "Metadata reloaded successfully" message

5. **Test the Fix**:
   - Go to **API** tab in Hasura Console
   - Run this query:
     ```graphql
     query TestRelationships {
       VariableAttributes(limit: 1) {
         id
         stationId
         Variable {
           id
           name
         }
         Component {
           id
           name
         }
       }
     }
     ```
   - **Expected**: Query returns data without errors
   - **Failure**: Error "field 'Variable' not found" → Try Option B

#### Option B: Restart Hasura Service

If Option A doesn't work, Hasura may need a full restart:

1. **Render Dashboard**:
   - Go to https://dashboard.render.com
   - Navigate to **juicehub-hasura** service

2. **Manual Deploy** (forces restart):
   - Click **"Manual Deploy"** → **"Deploy latest commit"**
   - Wait 3-5 minutes for service to restart

3. **Retry Option A** after restart completes

#### Option C: Verify Database Foreign Keys

If both options fail, check if foreign keys exist in database:

1. **Open Supabase SQL Editor**
2. **Run this query**:
```sql
-- Check if foreign key constraints exist
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'VariableAttributes'
  AND (kcu.column_name = 'variableId' OR kcu.column_name = 'componentId');
```

**Expected**: 2 rows showing foreign keys for `variableId` and `componentId`
**If empty**: Foreign keys don't exist → Database migration issue

### Verification Steps
1. Go to https://juicehub-ui.onrender.com
2. Navigate to **Variable Attributes** page (in sidebar)
3. **Expected**:
   - ✅ Page loads without errors
   - ✅ Variable and Component columns show data (not blank/null)
4. Go to **Charging Stations** → **WALLBOX-HOME-001** → **Aggregated Meter Values Data** tab
5. **Expected**:
   - ✅ Charts display without GraphQL errors
   - ✅ No "field 'Variable' not found" error

---

## ⏸️ ERROR 3: Google Maps - API Key Missing (SETUP GUIDE CREATED)

### Symptom
```
Error
This page can't load Google Maps correctly.
Do you own this website?
```

**Impact**:
- Locations page shows error instead of map
- Cannot view charger locations geographically
- Map component broken across all pages using it

### Root Cause
Google Maps JavaScript API key not configured in environment variables (`REACT_APP_GOOGLE_MAPS_API_KEY`).

### Fix Steps (User Action Required)

**✅ SETUP GUIDE CREATED**: Complete instructions available in [GOOGLE-MAPS-SETUP-GUIDE.md](GOOGLE-MAPS-SETUP-GUIDE.md)

**Quick Start** (15-20 minutes total):

#### Step 1: Get Google Maps API Key from Google Cloud Console

1. **Go to** https://console.cloud.google.com
2. **Create or select a project** (e.g., "JuiceHub")
3. **Enable Maps JavaScript API**:
   - APIs & Services → Library
   - Search "Maps JavaScript API"
   - Click Enable
4. **Create API Key**:
   - APIs & Services → Credentials
   - Click "+ CREATE CREDENTIALS" → "API key"
   - Copy the key (starts with `AIza...`)

#### Step 2: Restrict API Key (Security)

1. **Click on the API key** you just created
2. **Set Application restrictions**:
   - Select "HTTP referrers (web sites)"
   - Add referrers:
     - `https://juicehub-ui.onrender.com/*`
     - `http://localhost:3000/*`
     - `http://localhost:5173/*`
3. **Set API restrictions**:
   - Select "Restrict key"
   - Check only: "Maps JavaScript API"
4. **Click Save**

#### Step 3: Add to Render Environment Variables

1. **Open Render Dashboard**: https://dashboard.render.com
2. **Navigate to juicehub-ui service**
3. **Click Environment tab** → **Add Environment Variable**
4. **Enter**:
   - Key: `REACT_APP_GOOGLE_MAPS_API_KEY`
   - Value: Your API key (e.g., `AIzaSyB...`)
5. **Click Save Changes** (triggers automatic redeploy)

#### Step 4: Verify After Redeploy

1. **Wait 3-5 minutes** for Render build to complete
2. **Go to** https://juicehub-ui.onrender.com
3. **Navigate to Locations page**
4. **Expected**:
   - ✅ Map loads and displays
   - ✅ Charger markers appear
   - ✅ Can zoom, pan, and click markers
   - ✅ No "This page can't load Google Maps correctly" error

### Cost Information

**Google Maps Pricing**:
- **Free tier**: $200 credit/month
- **Equivalent to**: ~28,000 map loads/month
- **JuiceHub estimated usage**: 100-500 loads/month
- **Expected cost**: $0/month (well within free tier)

### Troubleshooting

**If map still doesn't load after setup**:
1. Check [GOOGLE-MAPS-SETUP-GUIDE.md](GOOGLE-MAPS-SETUP-GUIDE.md) → Troubleshooting section
2. Verify API key is correct in Render environment
3. Check browser console (F12) for specific error messages
4. Verify HTTP referrer restrictions include `juicehub-ui.onrender.com`
5. Hard refresh browser (Ctrl+Shift+R)

### Verification Steps
1. Complete all 4 steps in [GOOGLE-MAPS-SETUP-GUIDE.md](GOOGLE-MAPS-SETUP-GUIDE.md)
2. Wait for Render build to complete
3. Navigate to Locations page
4. Verify map loads correctly
5. Verify charger markers appear
6. No errors in browser console

---

## ⏸️ ERROR 4: Error Logs - Table Missing (SETUP GUIDE CREATED)

### Symptom
```
Error (status code: undefined)
You do not have permission to access this resource.
Please contact your administrator if you believe this is a mistake.
```

**Impact**:
- Error Logs page inaccessible
- Cannot view system errors or OCPP errors
- Error tracking functionality not available

### Root Cause
**Investigation Result**: The `ErrorLogs` table does not exist in the database.

This is not a permissions issue - the table was never created. The Error Logs feature was designed but not yet implemented in the database schema.

### Fix Steps (User Action Required)

**✅ SETUP GUIDE CREATED**: Complete instructions available in [ERROR-LOGS-SETUP-GUIDE.md](ERROR-LOGS-SETUP-GUIDE.md)

**Quick Start** (5-10 minutes total):

#### Step 1: Create ErrorLogs Table in Supabase

1. **Open** [create-error-logs-table.sql](create-error-logs-table.sql)
2. **Copy** the entire SQL script
3. **Open Supabase SQL Editor**
4. **Paste and Run** the script
5. **Verify** you see: "1 row" in results (sample error created)

#### Step 2: Track Table in Hasura

1. **Open Hasura Console**: https://juicehub-hasura.onrender.com/console
2. **Login** with admin secret: `devadmin123`
3. **Click Data tab** → Look for **Untracked tables**
4. **Find ErrorLogs** → Click **Track** button
5. **Configure Permissions**:
   - Click ErrorLogs table → Permissions tab
   - For admin role: Enable **select**, **insert**, **update**, **delete**
   - Set all to "Without any checks"

#### Step 3: Test the Fix

1. **In Hasura Console**, go to API tab
2. **Run this query**:
   ```graphql
   query TestErrorLogs {
     ErrorLogs(limit: 10, order_by: { occurred_at: desc }) {
       id
       severity
       category
       message
       component
       occurred_at
     }
   }
   ```
3. **Expected**: Returns at least 1 error (the sample "ErrorLogs table created successfully")

#### Step 4: Verify UI

1. **Go to** https://juicehub-ui.onrender.com
2. **Navigate to Error Logs page** (in sidebar)
3. **Expected**:
   - ✅ Page loads without permission error
   - ✅ Error logs table displays
   - ✅ Shows at least 1 sample error
   - ✅ Can filter and search

### What the ErrorLogs Table Provides

**Features**:
- Track errors by severity (critical, error, warning, info)
- Categorize errors (ocpp, database, api, frontend, authentication, system, other)
- Link errors to specific charging stations or transactions
- Track error status (open, investigating, resolved, ignored)
- Store detailed error information (stack traces, context)
- Full-text search capabilities
- Performance-optimized with 7 indexes

**Table Schema**:
- 18 columns total
- Primary fields: severity, category, message, error_details, component
- Context fields: station_id, transaction_id, user_id
- Tracking fields: status, occurred_at, resolved_at, resolution_notes
- Auto-updating updated_at timestamp

### Verification Steps
1. Complete all 4 steps in [ERROR-LOGS-SETUP-GUIDE.md](ERROR-LOGS-SETUP-GUIDE.md)
2. Verify Error Logs page loads correctly
3. Verify you can see the sample error in the table
4. No "permission denied" errors
5. Can filter by severity, category, and status

---

## 📊 Frontend Verification Checklist

After all fixes applied, verify each page:

### Overview Page
- [ ] Sessions Today card displays number (not spinner)
- [ ] Energy Delivered card displays kWh
- [ ] Revenue card displays dollar amount
- [ ] 7-Day Usage Trends chart shows data
- [ ] No GraphQL errors in browser console

### Locations Page
- [ ] Google Maps loads correctly
- [ ] Charger markers appear on map
- [ ] Can click markers to view details

### Charging Stations Page
- [ ] Station list displays
- [ ] Can open WALLBOX-HOME-001 detail page
- [ ] **Aggregated Meter Values Data** tab loads without errors
- [ ] Variable Attributes GraphQL query succeeds

### Variable Attributes Page
- [ ] Page loads without errors
- [ ] Variable column populated
- [ ] Component column populated
- [ ] No "field not found" errors

### Error Logs Page
- [ ] Page loads without permission error
- [ ] Error logs table displays
- [ ] Can filter and search logs

### Analytics Dashboard
- [ ] All analytics pages accessible
- [ ] Charts render correctly
- [ ] No GraphQL errors

### Alerts Dashboard
- [ ] Alerts pages load
- [ ] Can create/view/edit alerts
- [ ] No permission errors

---

## 🚀 Deployment Timeline

| Commit | Time | Changes | Status |
|--------|------|---------|--------|
| f463a28 | Jan 6, 11:37 AM | Usage Snapshots gqlVariables fix | ✅ Deployed |
| 9e331e5 | Jan 6, 1:07 PM | NoAuthorization auto-accept + diagnostic logging | ✅ Deployed |
| 5058c03 | Jan 7, 12:00 AM | Complete gqlVariables fix (trend cards) | ✅ **JUST DEPLOYED** |

**Next Deployment**: After Hasura metadata reload (no code changes needed)

---

## 🔧 If Errors Persist After Fixes

### Check Deployment Status
```bash
# Verify OperatorUI deployed latest commit
curl -s https://juicehub-ui.onrender.com | grep "5058c03"
# If not found, wait a few more minutes
```

### Force Clear Browser Cache
1. Open browser Developer Tools (F12)
2. Right-click Reload button → **Empty Cache and Hard Reload**
3. Or: Settings → Clear browsing data → Cached images and files

### Check Hasura Health
```bash
# Test Hasura health
curl https://juicehub-hasura.onrender.com/healthz
# Expected: "OK"

# Test GraphQL endpoint
curl -X POST https://juicehub-hasura.onrender.com/v1/graphql \
  -H "x-hasura-admin-secret: devadmin123" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { ChargingStations { id } }"}'
# Expected: JSON response with data
```

### Render Logs Investigation
If specific pages still failing:

1. **Go to Render Dashboard**
2. **Navigate to juicehub-ui service** → **Logs**
3. **Search for**:
   - `Error` (runtime errors)
   - `GraphQL` (query errors)
   - `404` (missing resources)
4. **Share error messages** for further diagnosis

---

## 📞 When to Escalate

**Contact developer if**:
1. ✅ Frontend fixes deployed but errors persist after 10 minutes
2. ✅ Hasura metadata reload completed but relationships still not found
3. ✅ Foreign keys don't exist in database (Option C query returns empty)
4. ✅ Permissions configured but Error Logs still shows permission denied
5. ✅ Google Maps API key added but map still doesn't load

**What to provide**:
- Screenshots of specific errors (from browser console)
- Render deployment logs (if build failing)
- Hasura API test query results
- Database foreign key query results (if applicable)

---

**Last Updated**: January 7, 2026 12:00 AM PST
**Next Review**: After user completes Hasura metadata reload and Google Maps configuration
