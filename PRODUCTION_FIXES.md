# 🔧 Production Deployment Fixes

## Critical Issues Found During Testing

### ❌ Issue #1: OperatorUI Returns 404
**Severity**: CRITICAL - Blocks all frontend access

**Root Cause**: Incorrect publish directory configuration in Render

**Fix Steps**:
1. Go to Render Dashboard → `juicehub-operatorui` → Settings
2. Scroll to **"Publish Directory"**
3. Change value to: `OperatorUI/dist`
4. Click **"Save Changes"**
5. Go to **Manual Deploy** → **"Clear build cache & deploy"**
6. Wait 5-10 minutes for build to complete
7. Test: Visit https://juicehub-operatorui.onrender.com - should show login page

---

### ❌ Issue #2: Hasura Admin Secret Not Set
**Severity**: CRITICAL - Security vulnerability

**Root Cause**: Admin secret environment variable missing or incorrect

**Current State**:
- GraphQL API is accessible WITHOUT authentication (security risk)
- Admin secret `devadmin123` is rejected
- Environment variable may not be set correctly

**Fix Steps**:
1. Go to Render Dashboard → `juicehub-hasura` → Environment
2. Verify these variables exist:
   ```
   HASURA_GRAPHQL_ADMIN_SECRET=<your-secret>
   HASURA_GRAPHQL_ENABLE_CONSOLE=true
   HASURA_GRAPHQL_UNAUTHORIZED_ROLE=<leave empty for security>
   ```
3. **IMPORTANT**: If `HASURA_GRAPHQL_UNAUTHORIZED_ROLE` is set, DELETE it
   - This variable allows unauthenticated access (security risk)
4. Set a strong admin secret:
   ```
   HASURA_GRAPHQL_ADMIN_SECRET=<generate-strong-password>
   ```
5. Click **"Save Changes"**
6. Service will automatically redeploy

**Verify Fix**:
```bash
# This should fail (401 Unauthorized):
curl -X POST 'https://juicehub-hasura.onrender.com/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __schema { queryType { name } } }"}'

# This should succeed:
curl -X POST 'https://juicehub-hasura.onrender.com/v1/graphql' \
  -H 'Content-Type: application/json' \
  -H 'x-hasura-admin-secret: <your-secret>' \
  -d '{"query":"{ __schema { queryType { name } } }"}'
```

---

### ❌ Issue #3: Hasura Metadata Not Applied
**Severity**: CRITICAL - Database tables not accessible via GraphQL

**Root Cause**: Console-based metadata tracking is temporary and not persisted

**Fix Steps**:

#### Option A: Apply via Script (Recommended)
```bash
# From JuiceHub root directory
cd Hasura

# Set your admin secret (use the value from Render environment variables)
export HASURA_GRAPHQL_ADMIN_SECRET="your-secret-here"

# Apply metadata
./apply-metadata.sh
```

#### Option B: Apply via Hasura Console (Manual)
1. Go to https://juicehub-hasura.onrender.com/console
2. Login with admin secret (set in environment variables above)
3. Go to **Data** tab
4. Click **"public"** schema in left sidebar
5. Click **"Track All"** button
6. Click **"Track All Relations"**
7. Go to **Settings** → **Metadata Actions**
8. Click **"Export Metadata"**
9. Save the export (this creates a backup)

**Verify Fix**:
```bash
# Should return list of tables, not just "no_queries_available"
curl -s -X POST 'https://juicehub-hasura.onrender.com/v1/graphql' \
  -H 'Content-Type: application/json' \
  -H 'x-hasura-admin-secret: your-secret' \
  -d '{"query":"{ __type(name: \"query_root\") { fields { name } } }"}' | jq
```

---

### ⚠️ Issue #4: OperatorUI Environment Variables
**Severity**: HIGH - UI cannot connect to backend services

**Current State**: Unknown - need to verify after UI is accessible

**Fix Steps**:
1. Go to Render Dashboard → `juicehub-operatorui` → Environment
2. Verify these variables exist:
   ```
   VITE_GRAPHQL_ENDPOINT=https://juicehub-hasura.onrender.com/v1/graphql
   VITE_CORE_API_URL=https://juicehub-core.onrender.com
   VITE_ENABLE_KEYCLOAK=false
   ```
3. If any are missing, add them
4. Click **"Save Changes"**
5. Trigger a new deployment (Manual Deploy)

**Note**: Environment variables starting with `VITE_` are injected at build time, so you MUST redeploy after changing them.

---

## 📋 Post-Fix Verification Checklist

After applying all fixes, verify each service:

### ✅ Core API
- [ ] Health check: `curl https://juicehub-core.onrender.com/health`
- [ ] Should return: `{"status":"healthy"}`

### ✅ Hasura GraphQL
- [ ] Health check: `curl https://juicehub-hasura.onrender.com/healthz`
- [ ] Should return: `OK`
- [ ] Unauthenticated query should FAIL (401/403)
- [ ] Authenticated query should return tables list

### ✅ OperatorUI
- [ ] Load homepage: Visit https://juicehub-operatorui.onrender.com
- [ ] Should show login page (not 404)
- [ ] Check browser console for errors (F12)
- [ ] Verify network requests to GraphQL endpoint

---

## 🔒 Security Recommendations

### Immediate (Before Demo):
1. **Set strong Hasura admin secret** (20+ characters, alphanumeric + symbols)
2. **Remove UNAUTHORIZED_ROLE** environment variable
3. **Enable SSL/TLS** for all services (Render does this by default)
4. **Test CORS** - ensure only OperatorUI origin is allowed

### Post-Demo (Production Hardening):
1. **Implement proper authentication** (Keycloak, Auth0, etc.)
2. **Add rate limiting** to all API endpoints
3. **Enable Hasura role-based access control** (RBAC)
4. **Set up monitoring and alerting** (Render metrics, Sentry, etc.)
5. **Implement request logging** and audit trails
6. **Add database backups** (Supabase automated backups)
7. **Set up staging environment** separate from production

---

## 📞 Support

If you encounter issues:
1. Check Render logs: Dashboard → Service → Logs tab
2. Check browser console (F12 → Console tab)
3. Verify environment variables are set correctly
4. Ensure all services are deployed and running (not sleeping)

---

**Priority Order**: Fix #1 (OperatorUI) → Fix #2 (Admin Secret) → Fix #3 (Metadata) → Fix #4 (Env Vars)

**Estimated Time**: 15-20 minutes total
