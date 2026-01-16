# Google Maps API Key Setup Guide
**Date**: January 7, 2026
**Status**: Ready to configure

---

## Overview

This guide will set up the Google Maps JavaScript API for the Locations page in OperatorUI.

**What this fixes**:
- Locations page showing "This page can't load Google Maps correctly"
- Ability to view charger locations on a map
- Map markers for charging stations

---

## Step 1: Get Google Maps API Key

### 1.1 Access Google Cloud Console

1. Go to https://console.cloud.google.com
2. Sign in with your Google account

### 1.2 Create or Select a Project

**If you don't have a project yet**:
1. Click the project dropdown at the top
2. Click **New Project**
3. Enter project name: `JuiceHub` (or any name you prefer)
4. Click **Create**
5. Wait for project creation (30-60 seconds)
6. Select the newly created project

**If you already have a project**:
1. Click the project dropdown at the top
2. Select your existing project

### 1.3 Enable Google Maps JavaScript API

1. In the left sidebar, click **APIs & Services** → **Library**
   - Or use the search bar: type "APIs & Services"
2. In the API Library search box, type: `Maps JavaScript API`
3. Click on **Maps JavaScript API** in the results
4. Click the **Enable** button
5. Wait for the API to be enabled (5-10 seconds)

### 1.4 Create API Key

1. In the left sidebar, click **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** button at the top
3. Select **API key** from the dropdown
4. A popup will appear showing your new API key
5. **IMPORTANT**: Copy the API key immediately
   - It will look like: `AIzaSyB...` (starts with `AIza`)
   - Save it somewhere safe (you'll need it in Step 2)

**Example API Key Format**:
```
AIzaSyBdVl-cTICSwYKrZ847wgmfqLYdEKZ3s3A
```
(This is a sample - yours will be different)

---

## Step 2: Restrict API Key (Security Best Practice)

### 2.1 Configure Application Restrictions

1. After creating the API key, click **RESTRICT KEY** in the popup
   - Or click on the API key name in the credentials list
2. Scroll to **Application restrictions** section
3. Select **HTTP referrers (web sites)**
4. Click **+ ADD AN ITEM**
5. Add these referrers one by one:

```
https://juicehub-ui.onrender.com/*
http://localhost:3000/*
http://localhost:5173/*
```

**Why these URLs?**
- `juicehub-ui.onrender.com` - Production deployment
- `localhost:3000` - Local development (Create React App default)
- `localhost:5173` - Local development (Vite default)

### 2.2 Configure API Restrictions

1. Scroll to **API restrictions** section
2. Select **Restrict key**
3. Click the dropdown to select APIs
4. Find and check **Maps JavaScript API**
5. Click **OK**

**This ensures the API key can ONLY be used for Google Maps, not other Google services**

### 2.3 Save Restrictions

1. Scroll to the bottom
2. Click **Save** button
3. Wait for confirmation message

---

## Step 3: Add API Key to Render Environment

### 3.1 Open Render Dashboard

1. Go to https://dashboard.render.com
2. Navigate to **juicehub-ui** service
   - Find it in the services list
   - Click on the service name

### 3.2 Add Environment Variable

1. In the left sidebar, click **Environment** tab
2. Scroll down to **Environment Variables** section
3. Click **Add Environment Variable** button

**Enter the following**:
- **Key**: `REACT_APP_GOOGLE_MAPS_API_KEY`
- **Value**: Your API key from Step 1.4 (e.g., `AIzaSyB...`)

4. Click **Save Changes** button

### 3.3 Redeploy Service

**Option A: Automatic Redeploy** (Recommended)
- Render will automatically trigger a redeploy after saving the environment variable
- Wait 3-5 minutes for the build to complete
- Check the **Logs** tab to monitor the build progress

**Option B: Manual Redeploy**
1. Click **Manual Deploy** button in the top right
2. Select **Deploy latest commit**
3. Wait 3-5 minutes for the build to complete

---

## Step 4: Verify Configuration

### 4.1 Check Build Logs

1. In Render Dashboard, go to **juicehub-ui** service
2. Click **Logs** tab
3. Look for successful build messages:

```
Build succeeded
Starting server...
Server started on port 3000
```

**If build fails**:
- Check that the environment variable key is exactly: `REACT_APP_GOOGLE_MAPS_API_KEY`
- Check that the API key value doesn't have extra spaces or quotes
- Check the error message in logs for specific issues

### 4.2 Test Locations Page

1. Go to https://juicehub-ui.onrender.com
2. Navigate to **Locations** page (in sidebar)

**Expected**:
- ✅ Map loads and displays
- ✅ Charger markers appear on the map
- ✅ Can click markers to see charger details
- ✅ Can zoom and pan the map
- ✅ No "This page can't load Google Maps correctly" error

**If map still doesn't load**:
1. Check browser console for errors (F12 → Console tab)
2. Verify API key is enabled in Google Cloud Console
3. Verify HTTP referrer restrictions include your domain
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
5. Clear browser cache

### 4.3 Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for Google Maps-related messages

**Success Pattern**:
```
Google Maps JavaScript API loaded successfully
```

**Failure Patterns**:
```
Google Maps API error: InvalidKeyMapError
→ API key is invalid or not enabled

Google Maps API error: RefererNotAllowedMapError
→ HTTP referrer restrictions blocking the request

Google Maps API error: ApiNotActivatedMapError
→ Maps JavaScript API not enabled in Google Cloud Console
```

---

## Step 5: (Optional) Configure Map Settings

### 5.1 Default Map Location

If you want to customize the default map location when the Locations page loads:

**File**: `JuiceHub/OperatorUI/src/pages/locations/index.tsx`

Look for:
```typescript
const defaultCenter = {
  lat: 37.7749,  // San Francisco latitude
  lng: -122.4194 // San Francisco longitude
};
```

Change to your preferred location (e.g., your charging station's location).

### 5.2 Map Zoom Level

Adjust the default zoom level:

```typescript
const defaultZoom = 12;  // 1 = World, 20 = Building
```

**Common zoom levels**:
- 1: World view
- 5: Continent
- 10: City
- 15: Streets
- 20: Buildings

---

## Cost Estimation

### Google Maps Pricing (as of January 2026)

**Maps JavaScript API**:
- **Free tier**: $200 credit per month
- **Equivalent to**: ~28,000 map loads per month
- **After free tier**: $7 per 1,000 loads

**Dynamic Maps**:
- First 28,000 loads/month: Free (covered by $200 credit)
- Additional loads: $7 per 1,000

**For JuiceHub Use Case**:
- Estimated usage: 100-500 map loads per month
- **Expected cost**: $0/month (well within free tier)

### Monitoring Usage

1. Go to https://console.cloud.google.com
2. Navigate to **APIs & Services** → **Dashboard**
3. Click **Maps JavaScript API**
4. View usage metrics and quotas

**Set up billing alerts** (recommended):
1. Go to **Billing** → **Budgets & alerts**
2. Create a budget alert for $10/month
3. Get notified if costs approach limit

---

## Troubleshooting

### Error: "This page can't load Google Maps correctly"

**Possible Causes**:
1. API key not added to Render environment variables
2. API key has typo or extra spaces
3. Maps JavaScript API not enabled in Google Cloud Console
4. Render service not redeployed after adding env var

**Solutions**:
1. Verify `REACT_APP_GOOGLE_MAPS_API_KEY` exists in Render → Environment
2. Copy API key again from Google Cloud Console (avoid manual typing)
3. Re-enable Maps JavaScript API in Google Cloud Console
4. Trigger manual redeploy in Render

### Error: "RefererNotAllowedMapError"

**Cause**: HTTP referrer restrictions are blocking the request

**Solution**:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Under **Application restrictions**, verify:
   - `https://juicehub-ui.onrender.com/*` is listed
   - No typos in the URL
4. Try temporarily setting to **None** to test (then re-enable restrictions)

### Error: "InvalidKeyMapError"

**Cause**: API key is invalid or disabled

**Solution**:
1. Verify the API key is correct in Render environment
2. Check API key is still active in Google Cloud Console
3. Try creating a new API key and replacing the old one

### Error: Map loads but no markers appear

**Cause**: Charger location data missing from database

**Solution**:
1. Check database for charging stations:
```sql
SELECT id, "stationId", name, latitude, longitude
FROM "ChargingStations"
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

2. If latitude/longitude are NULL, update them:
```sql
UPDATE "ChargingStations"
SET latitude = 37.7749, longitude = -122.4194
WHERE "stationId" = 'WALLBOX-HOME-001';
```

---

## Security Best Practices

### ✅ DO:
- Use HTTP referrer restrictions to limit API key usage
- Restrict API key to only Maps JavaScript API
- Set up billing alerts to monitor costs
- Rotate API keys periodically (every 6-12 months)
- Use separate API keys for development vs production

### ❌ DON'T:
- Never commit API keys to Git repositories
- Never use the same API key for multiple projects
- Never leave API key unrestricted (Application restrictions: None)
- Never share API keys publicly or in screenshots

---

## Verification Checklist

After completing all steps, verify:

- [ ] Google Cloud project created
- [ ] Maps JavaScript API enabled
- [ ] API key created and copied
- [ ] HTTP referrer restrictions configured
- [ ] API restrictions set to Maps JavaScript API only
- [ ] Environment variable added to Render (REACT_APP_GOOGLE_MAPS_API_KEY)
- [ ] Render service redeployed successfully
- [ ] Locations page loads without errors
- [ ] Map displays with charger markers
- [ ] Can interact with map (zoom, pan, click markers)
- [ ] No errors in browser console

---

## Alternative: Use Environment-Specific API Keys

**For better security, use separate API keys for development vs production:**

### Development API Key
- Restrictions: `http://localhost:*`
- Store in: `.env.local` file (never commit to Git)

### Production API Key
- Restrictions: `https://juicehub-ui.onrender.com/*`
- Store in: Render environment variables

**File**: `.env.local` (for local development)
```bash
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyB...your-dev-key...
```

**Render**: Use production key in environment variables

---

**Last Updated**: January 7, 2026 12:20 AM PST
**Status**: Ready to configure
**Estimated Time**: 15-20 minutes
