# Environment Variables Checklist for Render Recreation

Before deleting the `juicehub-core` service, copy these values from your current Render dashboard.
After creating the new Docker service, you'll paste them back in.

## ✅ Required Variables to Copy

### Database (Supabase)
- [ ] `BOOTSTRAP_CITRINEOS_DATABASE_HOST`
  - Current value: `aws-1-us-east-1.pooler.supabase.com`
  - Note: Your actual Supabase pooler hostname

- [ ] `BOOTSTRAP_CITRINEOS_DATABASE_USERNAME`
  - Current value: `postgres.gciyfolepvvtxpfrmtjj`
  - Note: Project-qualified username for pooler

- [ ] `BOOTSTRAP_CITRINEOS_DATABASE_PASSWORD`
  - Current value: `[COPY FROM DASHBOARD]`
  - Note: Keep this secret secure

- [ ] `DATABASE_URL`
  - Current value: `postgresql://postgres.gciyfolepvvtxpfrmtjj:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
  - Note: Full connection string

### Message Queue (CloudAMQP)
- [ ] `AMQP_URL`
  - Current value: `[COPY FROM DASHBOARD]`
  - Note: Your CloudAMQP connection URL

### Email (Resend)
- [ ] `RESEND_API_KEY`
  - Current value: `[COPY FROM DASHBOARD IF SET]`
  - Note: Optional but recommended

### Other
- [ ] `CORS_ALLOWED_ORIGINS`
  - Current value: `[COPY FROM DASHBOARD IF CHANGED]`
  - Default: `*`

## 📝 Variables with Correct Defaults (No Action Needed)

These are already set correctly in render.yaml:
- `PORT` = `8080`
- `APP_NAME` = `all`
- `APP_ENV` = `docker`
- `NODE_ENV` = `production`
- `BOOTSTRAP_CITRINEOS_DATABASE_PORT` = `6543` ✅ (Updated for pooler)
- `BOOTSTRAP_CITRINEOS_DATABASE_NAME` = `postgres`
- `DB_STRATEGY` = `migrate`
- `BOOTSTRAP_CITRINEOS_FILE_ACCESS_TYPE` = `local`
- `BOOTSTRAP_CITRINEOS_FILE_ACCESS_LOCAL_DEFAULT_FILE_PATH` = `/tmp/citrine`
- `AWS_REGION` = `us-east-1`
- `AWS_ACCESS_KEY_ID` = `minioadmin`
- `AWS_SECRET_ACCESS_KEY` = `minioadmin`
- `EMAIL_FROM` = `noreply@juicehub.com`
- `ALLOW_UNKNOWN_CHARGERS` = `false`
- `ACME_ENV` = `staging`
- `ACME_EMAIL` = `admin@juicehub.net`

## 🔄 Recreation Steps

### Step 1: Document Current Values
1. Open current `juicehub-core` service in Render dashboard
2. Go to Environment tab
3. Copy all values marked with `[COPY FROM DASHBOARD]` above
4. Save them in a secure location (password manager, encrypted file, etc.)

### Step 2: Delete Old Service
1. Go to Settings tab (bottom of sidebar)
2. Scroll to bottom → "Delete Web Service"
3. Type service name to confirm
4. Click Delete

### Step 3: Create from Blueprint
1. Go to Render Dashboard → New → Blueprint
2. Select repository: `player20/JuiceHub`
3. Name: `JuiceHub Production`
4. Click "Apply"

Render will create THREE services:
- `juicehub-core` (Docker web service)
- `juicehub-hasura` (Hasura GraphQL)
- `juicehub-ui` (Static site frontend)

### Step 4: Set Environment Variables
For `juicehub-core`:
1. Go to Environment tab
2. Add the variables you copied in Step 1:
   - `BOOTSTRAP_CITRINEOS_DATABASE_HOST`
   - `BOOTSTRAP_CITRINEOS_DATABASE_USERNAME`
   - `BOOTSTRAP_CITRINEOS_DATABASE_PASSWORD`
   - `DATABASE_URL`
   - `AMQP_URL`
   - `RESEND_API_KEY` (if you have it)
3. Click "Save Changes" (triggers deploy)

For `juicehub-hasura`:
1. Go to Environment tab
2. Set `HASURA_GRAPHQL_DATABASE_URL` to same Supabase pooler URL
3. Save changes

### Step 5: Verify Docker Build
Watch the `juicehub-core` deployment logs. You MUST see:

✅ **Correct:**
```
==> Building Docker image from Server/deploy.Dockerfile...
FROM node:22 AS build
...
ENTRYPOINT ["/usr/local/apps/citrineos/entrypoint.sh"]
```

❌ **Wrong (STOP if you see this):**
```
==> Running build command 'yarn install; yarn build'...
```

### Step 6: Verify Entrypoint Execution
In the logs, confirm you see:

✅ **Expected:**
```
Created runtime directories: /tmp/citrine and ./Server/tmp/citrine
Executing DB strategy: migrate
Sequelize CLI [Node: 22.x.x, CLI: 6.x.x, ORM: 6.x.x]
== 20240101000000-create-initial-tables: migrating =======
== 20240101000000-create-initial-tables: migrated
Starting application...
```

### Step 7: Verify Success
Check for these indicators:

✅ **Database:**
- "Database connection has been established successfully"
- NO "relation does not exist" errors

✅ **Services:**
- "OCPP16Service initialized successfully"
- "OCPP201Service initialized successfully"
- "WebSocket servers listening on ports 8081, 8082, 8443, 8444, 8092"
- "HTTP server listening on port 8080"

✅ **Health Check:**
```bash
curl https://juicehub-core.onrender.com/health
```

## 🚨 Troubleshooting

**If you see Node.js build instead of Docker:**
- Service was created as wrong type
- Delete and recreate, ensuring Blueprint method is used
- Contact me if issue persists

**If migrations don't run:**
- Check that entrypoint.sh logs appear
- Verify `DB_STRATEGY=migrate` is set
- Check database connection variables

**If database connection fails:**
- Verify all 5 database variables are set correctly
- Confirm port is 6543 (pooler) not 5432
- Confirm username is `postgres.gciyfolepvvtxpfrmtjj` format
- Test connection from Render shell: `psql $DATABASE_URL`

## ✅ When Complete

Once all services are deployed successfully, you'll have:
- ✅ Core backend running on Docker with migrations complete
- ✅ Hasura GraphQL API connected to database
- ✅ Frontend UI connected to backend and GraphQL

Next steps:
- Configure custom domain (juicehub.net)
- Update CORS settings with actual frontend URL
- Switch ACME_ENV to production for real SSL certificates
- Set up monitoring and alerts
