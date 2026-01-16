# Google Maps API Key in Account Settings
**Date**: January 7, 2026
**Feature**: Database-backed Google Maps API key configuration

---

## Overview

The Google Maps API key is now configurable through the Account Settings page! Users can enter their API key directly in the UI instead of configuring environment variables on Render.

**Benefits**:
- ✅ No need to access Render dashboard
- ✅ Users can update API key anytime without redeployment
- ✅ Securely stored in database
- ✅ Can be toggled on/off without removing the key
- ✅ Falls back to environment variable if not configured

---

## Files Created/Modified

### Database Schema
- **[create-system-settings-table.sql](create-system-settings-table.sql)**
  - Creates `SystemSettings` table to store configuration
  - Fields: `google_maps_api_key`, `google_maps_enabled`, `organization_name`, etc.
  - Auto-updates `updated_at` timestamp on changes
  - Single-row table (only one settings record exists)

### GraphQL Queries
- **[OperatorUI/src/graphql/system-settings-queries.ts](OperatorUI/src/graphql/system-settings-queries.ts)**
  - `GET_SYSTEM_SETTINGS`: Fetch system settings
  - `UPDATE_SYSTEM_SETTINGS`: Update Google Maps API key and settings

### Context Provider
- **[OperatorUI/src/contexts/SystemSettingsContext.tsx](OperatorUI/src/contexts/SystemSettingsContext.tsx)**
  - React context for accessing system settings throughout the app
  - `useSystemSettings()` hook provides access to:
    - `settings`: Current system settings
    - `isLoading`: Loading state
    - `refetch()`: Refresh settings
    - `getGoogleMapsApiKey()`: Get API key with fallback logic

### UI Components
- **[OperatorUI/src/pages/settings/preferences/preferences.settings.tsx](OperatorUI/src/pages/settings/preferences/preferences.settings.tsx)** (Modified)
  - Added "Integration Settings" section
  - Google Maps API Key input field (password-protected display)
  - Enable/disable toggle
  - Link to Google Cloud Console for getting API key
  - Loads existing settings from database
  - Saves changes via GraphQL mutation

### Map Component
- **[OperatorUI/src/components/map/map.tsx](OperatorUI/src/components/map/map.tsx)** (Modified)
  - Uses `useSystemSettings()` hook instead of static config
  - Dynamically loads API key from context
  - Falls back to environment variable if database value not set

### App Wrapper
- **[OperatorUI/src/App.tsx](OperatorUI/src/App.tsx)** (Modified)
  - Wrapped app in `<SystemSettingsProvider>`
  - Makes settings available to all components

---

## Setup Instructions

### Step 1: Create SystemSettings Table in Database

1. **Open Supabase SQL Editor**
2. **Copy and run** [create-system-settings-table.sql](create-system-settings-table.sql)
3. **Verify** the table was created:
   ```sql
   SELECT * FROM "SystemSettings";
   ```
   Expected: 1 row with default values

### Step 2: Track Table in Hasura

1. **Open Hasura Console**: https://juicehub-hasura.onrender.com/console
2. **Login** with admin secret: `devadmin123`
3. **Go to Data tab** → Look for "Untracked tables or views"
4. **Find SystemSettings** → Click **Track** button
5. **Configure Permissions**:
   - Click on **SystemSettings** table
   - Go to **Permissions** tab
   - For **admin role**:
     - ✅ select: Without any checks
     - ✅ insert: Without any checks
     - ✅ update: Without any checks
     - ✅ delete: Without any checks
   - Click **Save** for each permission

### Step 3: Test GraphQL Queries

1. **In Hasura Console**, go to **API** tab
2. **Test GET query**:
   ```graphql
   query GetSystemSettings {
     SystemSettings(limit: 1) {
       id
       google_maps_api_key
       google_maps_enabled
       organization_name
       created_at
     }
   }
   ```
   Expected: Returns the default row

3. **Test UPDATE mutation**:
   ```graphql
   mutation UpdateSystemSettings {
     update_SystemSettings_by_pk(
       pk_columns: { id: 1 }
       _set: {
         google_maps_api_key: "test_key"
         google_maps_enabled: true
       }
     ) {
       id
       google_maps_api_key
       google_maps_enabled
       updated_at
     }
   }
   ```
   Expected: Updates the row and returns new values

### Step 4: Deploy Frontend Changes

All frontend code changes are ready. Commit and push:

```bash
cd /Users/jakesanch/citrine/JuiceHub

# Stage all changes
git add OperatorUI/src/graphql/system-settings-queries.ts
git add OperatorUI/src/contexts/SystemSettingsContext.tsx
git add OperatorUI/src/pages/settings/preferences/preferences.settings.tsx
git add OperatorUI/src/components/map/map.tsx
git add OperatorUI/src/App.tsx

# Commit
git commit -m "feat: Add Google Maps API key configuration in account settings

- Create SystemSettings table for storing configuration
- Add Integration Settings section to Preferences page
- Allow users to configure Google Maps API key via UI
- Implement SystemSettingsContext for app-wide settings access
- Update map component to use database-stored API key
- Fallback to environment variable if not configured in database"

# Push to main
git push origin main
```

### Step 5: Wait for Render Rebuild

1. Go to https://dashboard.render.com
2. Navigate to **juicehub-ui** service
3. Wait for automatic rebuild (~5-10 minutes)
4. Check **Logs** tab for successful deployment

---

## How to Use (User Guide)

### Configure Google Maps API Key

1. **Navigate to Settings**:
   - Click your profile icon (top right)
   - Select **Settings** from dropdown
   - Or go directly to: https://juicehub-ui.onrender.com/settings/preferences

2. **Scroll to "Integration Settings" Section**:
   - You'll see a blue info box about Google Maps API
   - Click **Get API Key** button to open Google Cloud Console (new tab)

3. **Get Your API Key** (if you don't have one):
   - Follow the instructions in [GOOGLE-MAPS-SETUP-GUIDE.md](GOOGLE-MAPS-SETUP-GUIDE.md)
   - Or use the original setup guide for detailed steps
   - Your API key should start with `AIza...`

4. **Enter API Key**:
   - Paste your API key into the "Google Maps API Key" field
   - The field is password-protected (click eye icon to show/hide)
   - Example: `AIzaSyBdVl-cTICSwYKrZ847wgmfqLYdEKZ3s3A`

5. **Enable Google Maps**:
   - Toggle the "Enable Google Maps" switch to **ON**
   - This activates the map features

6. **Save Preferences**:
   - Scroll to bottom
   - Click **Save Preferences** button
   - Wait for success message: "Preferences updated successfully"

7. **Verify It Works**:
   - Navigate to **Locations** page (sidebar)
   - Map should load with charger markers
   - No "This page can't load Google Maps correctly" error

### Update API Key Later

1. Go to **Settings → Preferences**
2. Scroll to **Integration Settings**
3. Update the Google Maps API Key field
4. Click **Save Preferences**
5. Refresh the Locations page to see changes

### Disable Google Maps Temporarily

1. Go to **Settings → Preferences**
2. Scroll to **Integration Settings**
3. Toggle **Enable Google Maps** to OFF
4. Click **Save Preferences**
5. Maps will not load even though API key is saved

---

## Technical Architecture

### API Key Loading Priority

The system uses a cascading priority for loading the Google Maps API key:

1. **Database (Highest Priority)**:
   - If `google_maps_enabled = true` AND `google_maps_api_key` is set
   - Uses the key stored in `SystemSettings` table
   - Allows per-user/per-organization configuration

2. **Environment Variable (Fallback)**:
   - If database key not set or disabled
   - Uses `REACT_APP_GOOGLE_MAPS_API_KEY` from Render environment
   - Uses `VITE_GOOGLE_MAPS_API_KEY` in development

3. **Default Placeholder (Last Resort)**:
   - If neither database nor environment variable set
   - Returns `'YOUR_GOOGLE_MAPS_API_KEY'` (will cause map error)

### Context Flow

```
App.tsx
  └─ SystemSettingsProvider
      ├─ Fetches SystemSettings from database (GraphQL)
      ├─ Provides settings via React Context
      └─ getGoogleMapsApiKey() method with fallback logic

LocationMap Component
  └─ useSystemSettings() hook
      └─ Calls getGoogleMapsApiKey()
          └─ Returns API key based on priority
```

### Data Flow

```
User Action (Preferences Page)
  ↓
GraphQL Mutation (UPDATE_SYSTEM_SETTINGS)
  ↓
Database Update (SystemSettings table)
  ↓
Context Refetch (automatic via useCustom)
  ↓
Map Component Remount
  ↓
API Key Retrieved (getGoogleMapsApiKey)
  ↓
Google Maps Loads with New Key
```

---

## Database Schema Reference

### SystemSettings Table

| Column | Type | Description | Default |
|--------|------|-------------|---------|
| `id` | SERIAL | Primary key | Auto-increment |
| `google_maps_api_key` | VARCHAR(255) | Google Maps JavaScript API key | NULL |
| `google_maps_enabled` | BOOLEAN | Enable/disable maps feature | false |
| `organization_name` | VARCHAR(255) | Organization name (future use) | NULL |
| `support_email` | VARCHAR(255) | Support contact email | NULL |
| `support_phone` | VARCHAR(50) | Support contact phone | NULL |
| `created_at` | TIMESTAMPTZ | Record creation time | NOW() |
| `updated_at` | TIMESTAMPTZ | Last update time | NOW() (auto-updates) |

**Important**: This table should contain exactly **1 row**. The SQL script creates it with `id = 1`.

---

## Troubleshooting

### Map Still Shows Error After Saving API Key

**Possible Causes**:
1. `google_maps_enabled` is still OFF
2. API key is invalid or not restricted correctly
3. Frontend not rebuilt/refreshed after database changes

**Solutions**:
1. Check Settings → Preferences → Enable Google Maps toggle is ON
2. Verify API key in Google Cloud Console is active
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for specific error messages

### Settings Not Loading in UI

**Possible Causes**:
1. SystemSettings table not tracked in Hasura
2. Permissions not configured
3. Database query failing

**Solutions**:
1. Check Hasura Console → Data → SystemSettings is tracked
2. Verify permissions are set for admin role
3. Test GraphQL query in Hasura API tab
4. Check browser console for GraphQL errors

### API Key Not Being Used

**Possible Causes**:
1. `google_maps_enabled` toggle is OFF
2. API key field is empty
3. Frontend code not deployed

**Solutions**:
1. Verify Settings → Integration Settings shows your API key (click eye icon)
2. Verify Enable Google Maps toggle is ON
3. Check Render build logs confirm latest code deployed
4. Inspect map component: `console.log(getGoogleMapsApiKey())`

### "Preferences updated successfully" But Changes Not Saved

**Possible Causes**:
1. GraphQL mutation failing silently
2. Database connection issue
3. Hasura permissions blocking update

**Solutions**:
1. Open browser Developer Tools (F12) → Network tab
2. Save preferences again and check for GraphQL errors
3. Verify mutation response in Network tab
4. Test mutation directly in Hasura Console

---

## Future Enhancements

### Planned Features

1. **Multi-Tenant Support**:
   - Separate settings per organization/tenant
   - Different API keys for different user groups

2. **Additional Integration Settings**:
   - SendGrid API key (email notifications)
   - Twilio API key (SMS alerts)
   - Stripe API key (payment processing)
   - Slack webhook URL (incident notifications)

3. **API Key Security**:
   - Encrypt API keys in database
   - Audit log for API key changes
   - Rotation reminders (warn if key >6 months old)

4. **Usage Monitoring**:
   - Track Google Maps API usage
   - Alert if approaching quota limits
   - Display cost estimates in UI

5. **Validation**:
   - Test API key validity before saving
   - Show green checkmark if key works
   - Show error if key is invalid

---

## Security Considerations

### API Key Storage

- API keys are stored in **plain text** in the database
- Access controlled via Hasura permissions (admin role required)
- Displayed as password field in UI (click to reveal)
- Transmitted over HTTPS only

### Recommendations

1. **Use Restricted API Keys**:
   - Always configure HTTP referrer restrictions
   - Limit to only Maps JavaScript API
   - Never use unrestricted keys

2. **Monitor Access**:
   - Review Hasura logs for SystemSettings changes
   - Track who updated API keys and when
   - Alert on unauthorized access attempts

3. **Regular Rotation**:
   - Rotate API keys every 6-12 months
   - Update in Settings immediately after rotation
   - Old key can be disabled in Google Cloud Console

---

**Last Updated**: January 7, 2026 12:45 AM PST
**Status**: Ready to deploy
**Estimated Setup Time**: 10-15 minutes
