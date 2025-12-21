# 🔒 Security Setup Guide

This guide contains critical security actions required before production deployment.

---

## 🚨 Critical: Rotate Exposed Secrets

### 1. Google Maps API Key (EXPOSED IN GIT HISTORY)

**⚠️ CRITICAL:** The API key `AIzaSyCuGWVIrYtV_EjtMgeJuYSnbcxxF2j2nts` was committed to git history and is publicly visible on GitHub.

**Immediate Actions Required:**

#### Step 1: Disable Exposed Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find the key: `AIzaSyCuGWVIrYtV_EjtMgeJuYSnbcxxF2j2nts`
4. Click **Delete** or **Disable** immediately

#### Step 2: Create New Restricted Key
1. Click **+ CREATE CREDENTIALS** → **API key**
2. Copy the new key (you'll need it in Step 3)
3. Click **Edit API key** and configure restrictions:
   - **Application restrictions:**
     - Select "HTTP referrers (web sites)"
     - Add website restrictions:
       ```
       juicehub-ui.onrender.com/*
       localhost:5173/*
       ```
   - **API restrictions:**
     - Select "Restrict key"
     - Enable only: **Maps JavaScript API**, **Geocoding API**, **Places API**
4. Click **Save**

#### Step 3: Update Render Environment
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select **juicehub-ui** service
3. Navigate to **Environment** tab
4. Update `VITE_GOOGLE_MAPS_API_KEY` with your new key
5. Click **Save Changes**
6. Manually deploy to apply new environment variable

#### Step 4: Update Local .env
```bash
cd OperatorUI
# Edit .env file
# Replace VITE_GOOGLE_MAPS_API_KEY with new key
```

**⚠️ DO NOT commit the new key to git!**

---

### 2. Hasura Admin Secret (WEAK PASSWORD)

**Current secret:** `devadmin123` (8 characters, easily guessable)
**Required:** 32+ character cryptographically random string

#### Step 1: Generate Strong Secret
```bash
# Generate 32-character base64 secret
openssl rand -base64 32

# Example output: 8kJ9mNpQ2rT5vX7wZ1aB3cD4eF6gH8iJ9kL0mN2oP4qR5sT7uV9w
```

#### Step 2: Update Hasura Service
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select **juicehub-hasura** service
3. Navigate to **Environment** tab
4. Update `HASURA_GRAPHQL_ADMIN_SECRET` with generated secret
5. Click **Save Changes**
6. Service will automatically redeploy

#### Step 3: Update OperatorUI Service
1. Select **juicehub-ui** service
2. Navigate to **Environment** tab
3. Update `VITE_HASURA_ADMIN_SECRET` with **same** secret
4. Click **Save Changes**
5. Manually deploy

#### Step 4: Update Local .env
```bash
cd OperatorUI
# Edit .env file
# Replace VITE_HASURA_ADMIN_SECRET with new secret
```

---

### 3. CORS Configuration (UPDATED)

CORS has been updated to restrict origins to known domains.

**Verify in Render Dashboard:**

#### Core Service (`juicehub-core`)
```
CORS_ALLOWED_ORIGINS=https://juicehub-ui.onrender.com,http://localhost:5173
```

#### Hasura Service (`juicehub-hasura`)
```
HASURA_GRAPHQL_CORS_DOMAIN=https://juicehub-ui.onrender.com
```

**Test CORS after deployment:**
```bash
# Should succeed (allowed origin)
curl -H "Origin: https://juicehub-ui.onrender.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://juicehub-core.onrender.com/health

# Should fail (blocked origin)
curl -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://juicehub-core.onrender.com/health
```

---

## ✅ Production Readiness Checklist

Before launching to production, verify all security measures:

### Secrets Management
- [ ] Google Maps API key rotated and restricted to domain
- [ ] Hasura admin secret updated (32+ characters)
- [ ] No `.env` files committed to git (`git ls-files | grep .env` returns nothing)
- [ ] All team members have updated local `.env` files

### Access Control
- [ ] CORS restricted to production domain
- [ ] Keycloak/OIDC authentication configured (not using LocalBypassAuthProvider)
- [ ] Hasura role-based permissions configured
- [ ] Database credentials use strong passwords

### Vulnerability Management
- [ ] `npm audit` shows 0 vulnerabilities in Core
- [ ] `npm audit` shows 0 vulnerabilities in OperatorUI
- [ ] Dependencies are up to date

### Infrastructure
- [ ] SSL/TLS certificates valid
- [ ] Database backups configured
- [ ] Monitoring and alerting active
- [ ] Rate limiting configured

---

## 🔄 Secret Rotation Schedule

Establish a regular rotation schedule for production:

| Secret | Rotation Frequency | Last Rotated | Next Rotation |
|--------|-------------------|--------------|---------------|
| Google Maps API Key | Annually | [Date] | [Date] |
| Hasura Admin Secret | Quarterly | [Date] | [Date] |
| Database Password | Quarterly | [Date] | [Date] |
| JWT Signing Key | Quarterly | [Date] | [Date] |

---

## 📞 Security Incident Response

If you suspect a security breach:

1. **Immediate Actions:**
   - Rotate all exposed credentials immediately
   - Check Render logs for unauthorized access
   - Review Hasura audit logs
   - Check database for suspicious activity

2. **Investigation:**
   - Identify scope of exposure
   - Review git history for other exposed secrets
   - Check access logs for IP addresses

3. **Remediation:**
   - Update all affected secrets
   - Force logout all users
   - Review and update security policies

4. **Post-Incident:**
   - Document incident timeline
   - Update security procedures
   - Conduct team training

---

## 📚 Additional Resources

- [Google Cloud API Security Best Practices](https://cloud.google.com/docs/security/best-practices-for-securing-apis)
- [Hasura Security Best Practices](https://hasura.io/docs/latest/security/security-best-practices/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Render Security Documentation](https://render.com/docs/security)

---

**Last Updated:** December 20, 2025
**Reviewed By:** Claude Sonnet 4.5 (Automated Security Audit)
