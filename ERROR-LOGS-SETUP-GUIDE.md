# Error Logs Table Setup Guide
**Date**: January 7, 2026
**Status**: Ready to deploy

---

## Overview

This guide will create the ErrorLogs table in your database and configure it for use in the OperatorUI.

**What this fixes**:
- Error Logs page showing "You do not have permission to access this resource"
- Ability to track system errors, OCPP errors, and application errors
- Error monitoring and resolution tracking

---

## Step 1: Create ErrorLogs Table in Supabase

### 1.1 Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### 1.2 Run the SQL Script

1. Open the file: `create-error-logs-table.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** button

**Expected Output**:
```
total_errors | severity | category | status
-------------|----------|----------|----------
1            | info     | system   | resolved
```

This confirms the table was created successfully with a sample error entry.

### 1.3 Verify Table Exists

Run this query to confirm:
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ErrorLogs'
ORDER BY ordinal_position;
```

**Expected**: Should show 18 columns (id, severity, category, error_code, message, etc.)

---

## Step 2: Track Table in Hasura

### 2.1 Open Hasura Console

1. Go to https://juicehub-hasura.onrender.com/console
2. Login with admin secret: `devadmin123`
3. Click **Data** tab in top menu

### 2.2 Track the ErrorLogs Table

1. In the left sidebar, look for **Untracked tables or views**
2. Find **ErrorLogs** in the list
3. Click **Track** button next to it
4. Wait for confirmation message

**If "Untracked tables" section is empty**:
- Click **Reload Metadata** button (gear icon → Reload Metadata)
- Refresh the page
- Check again for ErrorLogs table

### 2.3 Configure Permissions

1. Click on **ErrorLogs** table in the left sidebar
2. Click **Permissions** tab
3. Configure permissions for the role you use (likely `admin` or `user`)

**For admin role**:

| Operation | Permission | Configuration |
|-----------|------------|---------------|
| **select** | ✅ Allow | Without any checks |
| **insert** | ✅ Allow | Without any checks |
| **update** | ✅ Allow | Without any checks |
| **delete** | ✅ Allow | Without any checks |

**How to configure**:
1. Click **insert** → Check **Without any checks** → Click **Save**
2. Click **select** → Check **Without any checks** → Click **Save**
3. Click **update** → Check **Without any checks** → Click **Save**
4. Click **delete** → Check **Without any checks** → Click **Save**

---

## Step 3: Test Hasura GraphQL Query

### 3.1 Run Test Query

1. In Hasura Console, click **API** tab
2. Paste this query:

```graphql
query TestErrorLogs {
  ErrorLogs(limit: 10, order_by: { occurred_at: desc }) {
    id
    severity
    category
    message
    component
    station_id
    status
    occurred_at
    created_at
  }
}
```

3. Click **Play** button (▶)

**Expected Result**:
```json
{
  "data": {
    "ErrorLogs": [
      {
        "id": 1,
        "severity": "info",
        "category": "system",
        "message": "ErrorLogs table created successfully",
        "component": "Database",
        "station_id": null,
        "status": "resolved",
        "occurred_at": "2026-01-07T...",
        "created_at": "2026-01-07T..."
      }
    ]
  }
}
```

### 3.2 Test Insert Query

Verify you can insert errors:

```graphql
mutation TestErrorInsert {
  insert_ErrorLogs_one(
    object: {
      severity: "warning"
      category: "ocpp"
      message: "Test error from GraphQL"
      component: "OperatorUI"
      status: "open"
    }
  ) {
    id
    message
    created_at
  }
}
```

**Expected**: Should return the inserted error with id and timestamp.

---

## Step 4: Verify Error Logs Page in UI

### 4.1 Test the Page

1. Go to https://juicehub-ui.onrender.com
2. Navigate to **Error Logs** page (in sidebar)

**Expected**:
- ✅ Page loads without permission error
- ✅ Error logs table displays
- ✅ Shows at least 1-2 errors (from SQL script + test insert)
- ✅ Can filter by severity, category, status
- ✅ Can search by message

**If page still shows permission error**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check Hasura permissions were saved correctly
4. Verify Hasura metadata was reloaded

---

## Step 5: (Optional) Integrate Error Logging in Code

To start capturing real errors, integrate this table into your application code.

### Example: Core API Error Logging

**File**: `JuiceHub/Core/02_Util/src/logging/ErrorLogger.ts`

```typescript
import { DataSource } from 'typeorm';

export interface LogErrorParams {
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: 'ocpp' | 'database' | 'api' | 'frontend' | 'authentication' | 'system' | 'other';
  message: string;
  errorCode?: string;
  errorDetails?: Record<string, any>;
  component?: string;
  stationId?: string;
  transactionId?: string;
}

export class ErrorLogger {
  constructor(private dataSource: DataSource) {}

  async logError(params: LogErrorParams): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO "ErrorLogs"
         (severity, category, message, error_code, error_details, component, station_id, transaction_id, status, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', NOW())`,
        [
          params.severity,
          params.category,
          params.message,
          params.errorCode || null,
          params.errorDetails ? JSON.stringify(params.errorDetails) : null,
          params.component || 'Core',
          params.stationId || null,
          params.transactionId || null,
        ]
      );
    } catch (err) {
      // Fallback to console if database logging fails
      console.error('Failed to log error to database:', err);
      console.error('Original error:', params);
    }
  }
}
```

### Example: Frontend Error Logging

**File**: `JuiceHub/OperatorUI/src/utils/errorLogger.ts`

```typescript
import { gql } from 'graphql-tag';
import { dataProvider } from '../providers/dataProvider';

const LOG_ERROR_MUTATION = gql`
  mutation LogError(
    $severity: String!
    $category: String!
    $message: String!
    $component: String
    $errorDetails: jsonb
  ) {
    insert_ErrorLogs_one(
      object: {
        severity: $severity
        category: $category
        message: $message
        component: $component
        error_details: $errorDetails
        status: "open"
      }
    ) {
      id
    }
  }
`;

export async function logFrontendError(
  severity: 'critical' | 'error' | 'warning' | 'info',
  message: string,
  errorDetails?: Record<string, any>
): Promise<void> {
  try {
    await dataProvider.custom({
      url: '',
      method: 'post',
      meta: {
        operation: 'LogError',
        gqlVariables: {
          severity,
          category: 'frontend',
          message,
          component: 'OperatorUI',
          errorDetails: errorDetails || null,
        },
        gqlMutation: LOG_ERROR_MUTATION,
      },
    });
  } catch (err) {
    console.error('Failed to log error to database:', err);
  }
}
```

---

## Table Schema Reference

### Columns

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `id` | SERIAL | Primary key | Auto |
| `severity` | VARCHAR(20) | 'critical', 'error', 'warning', 'info' | Yes |
| `category` | VARCHAR(50) | 'ocpp', 'database', 'api', 'frontend', 'authentication', 'system', 'other' | Yes |
| `error_code` | VARCHAR(50) | Custom error code (e.g., 'OCPP_ERR_001') | No |
| `message` | TEXT | Human-readable error message | Yes |
| `error_details` | JSONB | Structured error data (stack trace, context, etc.) | No |
| `component` | VARCHAR(100) | Service/module: 'Core', 'OperatorUI', 'Hasura', etc. | No |
| `station_id` | VARCHAR(255) | Associated charging station | No |
| `transaction_id` | VARCHAR(50) | Associated transaction | No |
| `user_id` | VARCHAR(100) | User who triggered the error | No |
| `status` | VARCHAR(20) | 'open', 'investigating', 'resolved', 'ignored' | Default: 'open' |
| `occurred_at` | TIMESTAMPTZ | When the error occurred | Default: NOW() |
| `resolved_at` | TIMESTAMPTZ | When the error was resolved | No |
| `resolved_by` | VARCHAR(100) | Who resolved the error | No |
| `resolution_notes` | TEXT | Notes about the resolution | No |
| `created_at` | TIMESTAMPTZ | Record creation timestamp | Default: NOW() |
| `updated_at` | TIMESTAMPTZ | Record update timestamp | Auto-updated |

### Indexes

- `idx_errorlogs_severity` - Query by severity
- `idx_errorlogs_category` - Query by category
- `idx_errorlogs_status` - Query by status
- `idx_errorlogs_station_id` - Query by station
- `idx_errorlogs_occurred_at` - Sort by occurrence time
- `idx_errorlogs_created_at` - Sort by creation time
- `idx_errorlogs_status_severity` - Composite index for filtering

---

## Verification Checklist

After completing all steps, verify:

- [ ] SQL script executed successfully in Supabase
- [ ] ErrorLogs table visible in Supabase Table Editor
- [ ] Table tracked in Hasura (visible in Data tab)
- [ ] Permissions configured for admin role (select, insert, update, delete)
- [ ] Test GraphQL query returns sample error
- [ ] Test insert mutation creates new error
- [ ] Error Logs page loads without permission error
- [ ] Can view errors in the UI table
- [ ] Can filter and search errors
- [ ] No GraphQL errors in browser console

---

## Troubleshooting

### Issue: Table not appearing in Hasura

**Solution**:
1. Click gear icon (Settings) → **Reload Metadata**
2. Refresh Hasura Console page
3. Check Data tab → Untracked tables section

### Issue: Permission error persists

**Solution**:
1. Verify permissions saved correctly (click on ErrorLogs → Permissions tab)
2. Clear browser cache (Ctrl+Shift+R)
3. Check you're using the correct role (admin vs user)
4. Verify Hasura admin secret is correct

### Issue: GraphQL query returns empty array

**Solution**:
This is normal if no errors exist yet. Run the test insert mutation to create a sample error.

### Issue: UI page shows "field not found" error

**Solution**:
1. Check that table name is exactly `ErrorLogs` (capital E, capital L)
2. Verify Hasura metadata was reloaded after tracking table
3. Check GraphQL query in UI matches the table schema

---

**Last Updated**: January 7, 2026 12:15 AM PST
**Status**: Ready to deploy
