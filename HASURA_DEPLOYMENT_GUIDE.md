# Hasura GraphQL Engine - Deployment Guide

**Service:** juicehub-hasura
**Purpose:** GraphQL API layer for OperatorUI frontend
**Status:** Ready to deploy

---

## 📋 Prerequisites

Before deploying Hasura, ensure you have:

1. ✅ **juicehub-core** backend deployed and running
2. ✅ Supabase PostgreSQL database with migrations completed
3. ✅ Supabase connection string (pooler URL)

---

## 🚀 Step 1: Deploy Hasura to Render

### Option A: Using Updated Blueprint (Recommended)

1. **Commit and Push** the updated render.yaml:
   ```bash
   cd /Users/jakesanch/citrine/JuiceHub
   git add render.yaml
   git commit -m "Add Hasura GraphQL configuration to render.yaml"
   git push
   ```

2. **Deploy via Render Dashboard**:
   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Select your GitHub repository: `player20/JuiceHub`
   - Render will detect the updated render.yaml
   - **Important**: It will try to create TWO services:
     - ✅ juicehub-core (already exists - skip/update)
     - 🆕 juicehub-hasura (new - deploy this one)

### Option B: Manual Service Creation

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. **Configure Service:**
   - **Environment:** Docker
   - **Image URL:** `hasura/graphql-engine:v2.40.3`
   - **Service Name:** `juicehub-hasura`
   - **Region:** Oregon
   - **Plan:** Starter ($7/mo)

---

## ⚙️ Step 2: Configure Environment Variables

Set these in the Render dashboard under "Environment":

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `HASURA_GRAPHQL_DATABASE_URL` | `postgresql://postgres.gciyfolepvvtxpfrmtjj:!Oliver2023@aws-1-us-east-1.pooler.supabase.com:6543/postgres` | **SAME** as Core backend database |
| `HASURA_GRAPHQL_ADMIN_SECRET` | `devadmin123` | **IMPORTANT:** Change in production! |
| `HASURA_GRAPHQL_METADATA_DATABASE_URL` | `postgresql://postgres.gciyfolepvvtxpfrmtjj:!Oliver2023@aws-1-us-east-1.pooler.supabase.com:6543/postgres` | Same as DATABASE_URL |

### Console & Settings

| Variable | Value |
|----------|-------|
| `HASURA_GRAPHQL_ENABLE_CONSOLE` | `true` |
| `HASURA_GRAPHQL_DEV_MODE` | `false` |
| `HASURA_GRAPHQL_ENABLED_LOG_TYPES` | `startup,http-log,webhook-log,websocket-log,query-log` |
| `HASURA_GRAPHQL_ENABLE_TELEMETRY` | `false` |
| `HASURA_GRAPHQL_SERVER_PORT` | `8080` |

### Security

| Variable | Value |
|----------|-------|
| `HASURA_GRAPHQL_UNAUTHORIZED_ROLE` | `anonymous` |
| `HASURA_GRAPHQL_CORS_DOMAIN` | `*` (update after frontend deployment) |

---

## 📦 Step 3: Apply Hasura Metadata

After Hasura is deployed and running, apply the metadata to configure GraphQL schema:

### Method 1: Using Hasura CLI (Recommended)

```bash
# Install Hasura CLI
npm install -g hasura-cli

# Navigate to Core directory
cd /Users/jakesanch/citrine/JuiceHub/Core

# Apply metadata
hasura metadata apply \
  --endpoint https://juicehub-hasura.onrender.com \
  --admin-secret devadmin123 \
  --project Server
```

### Method 2: Using Hasura Console

1. **Open Hasura Console:**
   - URL: https://juicehub-hasura.onrender.com/console
   - Admin Secret: `devadmin123`

2. **Import Metadata:**
   - Go to "Settings" → "Metadata Actions"
   - Click "Import Metadata"
   - Upload the metadata from `/Users/jakesanch/citrine/JuiceHub/Core/Server/hasura-metadata/`
   - Or use "Replace Metadata" → Upload entire directory as ZIP

### Method 3: Manual API Call

```bash
curl -X POST \
  https://juicehub-hasura.onrender.com/v1/metadata \
  -H 'Content-Type: application/json' \
  -H 'X-Hasura-Admin-Secret: devadmin123' \
  -d '{
    "type": "replace_metadata",
    "args": {
      "metadata": {
        "version": 3,
        "sources": [{
          "name": "default",
          "kind": "postgres",
          "configuration": {
            "connection_info": {
              "database_url": {
                "from_env": "HASURA_GRAPHQL_DATABASE_URL"
              }
            }
          }
        }]
      }
    }
  }'
```

---

## ✅ Step 4: Verify Deployment

### Test GraphQL Endpoint

```bash
# Health check
curl https://juicehub-hasura.onrender.com/healthz

# Test GraphQL (should require admin secret)
curl -X POST \
  https://juicehub-hasura.onrender.com/v1/graphql \
  -H 'Content-Type: application/json' \
  -H 'X-Hasura-Admin-Secret: devadmin123' \
  -d '{
    "query": "{ __schema { queryType { name } } }"
  }'
```

### Access Hasura Console

- **URL:** https://juicehub-hasura.onrender.com/console
- **Admin Secret:** `devadmin123`

Expected to see:
- ✅ Database "default" connected
- ✅ Tables tracked (Tenants, ChargingStations, Evses, Connectors, etc.)
- ✅ GraphQL schema generated
- ✅ Queries and mutations available

---

## 🔍 Troubleshooting

### Issue: Hasura won't start / 503 error

**Solution:** Check logs in Render dashboard:
- Verify `HASURA_GRAPHQL_DATABASE_URL` is set correctly
- Ensure Supabase database is accessible
- Check if port 6543 (pooler) is correct

### Issue: "database connection failed"

**Solution:**
- Use Supabase **pooler** connection string (port 6543)
- Format: `postgresql://postgres.projectid:password@host:6543/postgres`
- Verify username includes project ID: `postgres.gciyfolepvvtxpfrmtjj`

### Issue: "metadata not found"

**Solution:** Apply metadata using one of the methods in Step 3

### Issue: Console shows "no tables"

**Solution:**
1. Go to "Data" tab → "default" database
2. Click "Track All" to track existing tables
3. Or apply metadata which includes table tracking

---

## 📊 Expected GraphQL Schema

After metadata is applied, you should have access to:

### Queries
- `Tenants` - Multi-tenant configuration
- `Locations` - Charging station locations
- `ChargingStations` - OCPP charging stations
- `Evses` - Electric Vehicle Supply Equipment
- `Connectors` - Charging connectors
- `Transactions` - Charging transactions
- `TransactionEvents` - Transaction event log
- `Authorizations` - EV driver authorizations
- `MeterValues` - Energy meter readings
- `VariableAttributes` - OCPP variables and configurations

### Mutations
- Insert, update, delete operations for all tables
- Bulk operations support
- Upsert capabilities

### Subscriptions
- Real-time updates for all tables
- Live transaction monitoring
- Live charging station status

---

## 🔐 Security Hardening (Production)

Before going live, update these settings:

1. **Change Admin Secret:**
   ```
   HASURA_GRAPHQL_ADMIN_SECRET=<strong-random-secret>
   ```
   Generate using: `openssl rand -base64 32`

2. **Restrict CORS:**
   ```
   HASURA_GRAPHQL_CORS_DOMAIN=https://juicehub-ui.onrender.com
   ```

3. **Disable Dev Mode:**
   ```
   HASURA_GRAPHQL_DEV_MODE=false
   ```

4. **Enable Console in Production:**
   Keep `HASURA_GRAPHQL_ENABLE_CONSOLE=true` but protect with admin secret

5. **Configure Roles & Permissions:**
   - Set up user role in Hasura console
   - Configure row-level security
   - Define column permissions

---

## 📝 Next Steps

After Hasura is deployed and verified:

1. ✅ Hasura GraphQL engine running
2. ✅ Metadata applied
3. ✅ GraphQL schema available
4. ⏳ Deploy OperatorUI frontend
5. ⏳ Configure OperatorUI to connect to Hasura
6. ⏳ Test full stack (Core → Hasura → UI)

---

## 🎯 Success Criteria

Hasura deployment is successful when:

- [x] Service is live at https://juicehub-hasura.onrender.com
- [x] Health check returns `OK`
- [x] Console is accessible with admin secret
- [x] Database "default" shows as connected
- [x] All tables are tracked
- [x] GraphQL queries work via GraphiQL
- [x] Subscriptions are enabled

**Deployment Status:** Ready to deploy!
