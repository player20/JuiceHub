# OperatorUI Frontend - Deployment Guide

**Service:** juicehub-ui
**Type:** Static Site (Vite + React)
**Purpose:** Web interface for managing JuiceHub OCPP charging infrastructure
**Status:** Ready to deploy

---

## 📋 Prerequisites

Before deploying OperatorUI, ensure you have:

1. ✅ **juicehub-core** backend deployed and running
2. ✅ **juicehub-hasura** GraphQL API deployed and running
3. ✅ Hasura metadata applied and GraphQL schema available

---

## 🚀 Step 1: Deploy OperatorUI to Render

### Create Static Site

1. Go to https://dashboard.render.com
2. Click "New +" → "Static Site"
3. **Connect Repository:**
   - Select: `player20/JuiceHub`
   - Branch: `main`

4. **Configure Build:**
   - **Name:** `juicehub-ui`
   - **Root Directory:** `OperatorUI`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Region:** Oregon (same as backend)

---

## ⚙️ Step 2: Configure Environment Variables

Set these in the Render dashboard under "Environment":

### API & GraphQL Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://juicehub-hasura.onrender.com/v1/graphql` | Hasura GraphQL HTTP endpoint |
| `VITE_WS_URL` | `wss://juicehub-hasura.onrender.com/v1/graphql` | Hasura GraphQL WebSocket endpoint |
| `VITE_CITRINE_CORE_URL` | `https://juicehub-core.onrender.com` | CitrineOS Core backend URL |
| `VITE_HASURA_ADMIN_SECRET` | `devadmin123` | **IMPORTANT:** Change in production! |

### Application Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_APP_NAME` | `JuiceNet` | Your brand name |
| `VITE_LOGO_URL` | `/juicenet-icon.png` | Logo path (in public folder) |
| `VITE_TENANT_ID` | `1` | Default tenant ID |

### Google Maps (Optional)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyCuGWVIrYtV_EjtMgeJuYSnbcxxF2j2nts` | For location features |

### Authentication (Optional - if using Keycloak)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_KEYCLOAK_URL` | `https://your-keycloak.com` | If using Keycloak auth |
| `VITE_KEYCLOAK_REALM` | `juicehub` | Keycloak realm |
| `VITE_KEYCLOAK_CLIENT_ID` | `juicehub-ui` | Keycloak client |

---

## 📦 Step 3: Trigger Deployment

After setting environment variables:

1. Click "Manual Deploy" → "Deploy latest commit"
2. Wait for build to complete (usually 2-5 minutes)
3. Monitor build logs for any errors

### Expected Build Output

```
Installing dependencies...
npm install
...
Building for production...
npm run build
...
✓ built in 45s
...
Build successful!
Published to: dist/
```

---

## ✅ Step 4: Verify Deployment

### Access the UI

**URL:** https://juicehub-ui.onrender.com

### Test Login

1. Navigate to the login page
2. **Default Credentials:**
   - Email: `admin@citrineos.local`
   - Password: `wETfsM8QHrGT4vqxLN092w==` (base64 encoded)

### Verify Features

- [x] Login page loads
- [x] Dashboard displays after login
- [x] Charging stations list (may be empty initially)
- [x] Locations map loads
- [x] Navigation menu works
- [x] No console errors in browser DevTools

---

## 🔍 Troubleshooting

### Issue: Build fails with "Module not found"

**Solution:**
- Check package.json has all dependencies
- Verify Node version compatibility (should use Node 22)
- Clear npm cache: Set `NPM_CONFIG_CACHE=/tmp/npm-cache` in env vars

### Issue: White screen / blank page

**Solution:**
- Check browser console for errors
- Verify `VITE_API_URL` is set correctly
- Ensure Hasura is accessible from browser
- Check CORS settings on Hasura

### Issue: "Failed to fetch GraphQL schema"

**Solution:**
- Verify `VITE_API_URL` points to Hasura GraphQL endpoint
- Check `VITE_HASURA_ADMIN_SECRET` matches Hasura config
- Test Hasura directly: https://juicehub-hasura.onrender.com/console

### Issue: Login fails

**Solution:**
- Check `VITE_CITRINE_CORE_URL` is correct
- Verify Core backend is running
- Check browser network tab for failed requests

---

## 🔐 Update Backend CORS

After frontend is deployed, update the backend CORS settings:

### Update Hasura CORS

In Render dashboard for `juicehub-hasura`:

```
HASURA_GRAPHQL_CORS_DOMAIN=https://juicehub-ui.onrender.com
```

### Update Core Backend CORS (if needed)

In Render dashboard for `juicehub-core`:

```
CORS_ALLOWED_ORIGINS=https://juicehub-ui.onrender.com
```

Then redeploy both services.

---

## 🎨 Customization

### Update Branding

1. **Logo:** Replace `/Users/jakesanch/citrine/JuiceHub/OperatorUI/public/juicenet-icon.png`
2. **Favicon:** Update `OperatorUI/public/favicon.ico`
3. **Title:** Edit `OperatorUI/index.html` → `<title>` tag
4. **Theme:** Modify `OperatorUI/src/theme/`

### Commit and Redeploy

```bash
cd /Users/jakesanch/citrine/JuiceHub
git add OperatorUI/public/
git commit -m "Update branding assets"
git push
```

Render will automatically redeploy the static site.

---

## 📊 Frontend Features

### Dashboard
- Real-time charging station status
- Active transaction monitoring
- Revenue analytics
- System health metrics

### Locations
- Map view of charging stations
- Location management
- Address and coordinates

### Charging Stations
- Station inventory
- OCPP configuration
- Firmware management
- Status monitoring

### Transactions
- Transaction history
- Revenue tracking
- Energy consumption
- Session details

### Users & Authorization
- EV driver management
- Authorization tokens
- Local authorization lists

### Configuration
- System settings
- OCPP variables
- Network profiles
- Certificate management

---

## 🔒 Security Hardening (Production)

Before going live:

1. **Change Admin Secret:**
   ```
   VITE_HASURA_ADMIN_SECRET=<strong-random-secret>
   ```

2. **Remove Dev Tools:**
   - Comment out RefineDevtools in production build

3. **Enable HTTPS Only:**
   - Render provides automatic HTTPS
   - Ensure all URLs use `https://` protocol

4. **Configure Auth:**
   - Integrate Keycloak or Auth0
   - Remove hardcoded credentials
   - Implement proper role-based access control

5. **Set up Monitoring:**
   - Configure error tracking (e.g., Sentry)
   - Add analytics (e.g., Google Analytics)

---

## 📝 Next Steps

After OperatorUI is deployed:

1. ✅ Frontend accessible at https://juicehub-ui.onrender.com
2. ✅ Can login with default credentials
3. ✅ Dashboard loads successfully
4. ⏳ Test full workflow: Create location → Add station → Start transaction
5. ⏳ Configure production authentication
6. ⏳ Set up custom domain (juicehub.net)

---

## 🎯 Success Criteria

OperatorUI deployment is successful when:

- [x] Static site is live and accessible
- [x] No build errors
- [x] Login page loads correctly
- [x] Can authenticate with test credentials
- [x] Dashboard displays (even if empty)
- [x] GraphQL queries work (check Network tab)
- [x] WebSocket connection established
- [x] No console errors
- [x] Map loads (if Google Maps API key set)
- [x] Navigation between pages works

---

## 🌐 Custom Domain Setup (Optional)

To use `juicehub.net`:

1. **Add Custom Domain in Render:**
   - Go to juicehub-ui service → Settings → Custom Domains
   - Add: `app.juicehub.net` or `juicehub.net`

2. **Configure DNS:**
   - Add CNAME record pointing to Render
   - Wait for DNS propagation (up to 48 hours)

3. **Update Environment Variables:**
   - Update all service URLs to use custom domain
   - Redeploy frontend

**Deployment Status:** Ready to deploy!
