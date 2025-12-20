# JuiceHub Deployment Checklist

Use this checklist before deploying to production to catch issues early.

## Pre-Deployment

### 1. Code Quality
- [ ] All hardcoded values replaced with environment variables
- [ ] No test/mock/dummy data in production configs
- [ ] No `console.log` statements in production code
- [ ] All dependencies in correct `package.json` (dependencies vs devDependencies)
- [ ] No secrets committed to git

### 2. Build Verification

**Local Build Test:**
```bash
cd Core
npm run clean
npm run build
```
- [ ] Build completes without errors
- [ ] All modules built successfully
- [ ] Assets copied correctly (check `dist/assets/certificates/`)

**Docker Build Test:**
```bash
cd Core
docker build -f Server/deploy.Dockerfile -t juicehub-test .
```
- [ ] Docker build completes successfully
- [ ] No missing dependencies
- [ ] Certificate files present in image

**Test Container Locally:**
```bash
docker run --env-file .env.production -p 8080:8080 juicehub-test
```
- [ ] Container starts without crashes
- [ ] Connects to database successfully
- [ ] Connects to RabbitMQ successfully
- [ ] Health check endpoint responds

### 3. Environment Variables

**Validate env vars:**
```bash
cd Core/Server
npx ts-node src/validateEnv.ts
```
- [ ] All required variables present in Render dashboard
- [ ] All secret values (passwords, API keys) set to `sync: false` in render.yaml
- [ ] Database connection string correct
- [ ] AMQP_URL correct and accessible
- [ ] File paths use absolute paths (not relative)

**Production-specific settings:**
- [ ] `NODE_ENV=production` set
- [ ] `ALLOW_UNKNOWN_CHARGERS=false` (unless testing)
- [ ] `ACME_ENV` set to appropriate value (staging/production)
- [ ] `ACME_EMAIL` set to valid admin email
- [ ] `CORS_ALLOWED_ORIGINS` updated with frontend URL

### 4. Database

- [ ] Backup taken (if updating existing production database)
- [ ] Migrations tested locally
- [ ] Migration strategy set (`DB_STRATEGY=migrate` recommended)
- [ ] Database connection tested from deployment environment

### 5. External Services

**Test connectivity:**
- [ ] Supabase database accessible from Render region
- [ ] CloudAMQP connection URL valid and accessible
- [ ] Resend API key valid (test with API call)

### 6. Security

- [ ] All `.pem` files in git (certificates needed for OCPP)
- [ ] No actual private keys in git (only test certificates)
- [ ] Authentication configured (`localByPass` or OIDC)
- [ ] Unknown chargers blocked in production
- [ ] CORS origins restricted (not `*` in production)

## Deployment

### 1. Pre-Deploy
- [ ] Checklist above completed
- [ ] Changes tested in staging environment (if available)
- [ ] Team notified of deployment

### 2. Deploy
- [ ] Push to main branch
- [ ] Monitor Render build logs
- [ ] Watch for build errors

### 3. Post-Deploy Validation

**Immediately after deployment:**
- [ ] Service shows "Live" in Render dashboard
- [ ] Health check endpoint responding (`/health`)
- [ ] Check logs for startup errors
- [ ] No continuous crash loops
- [ ] Database migrations applied successfully

**Functional tests:**
- [ ] API endpoints responding
- [ ] Websocket servers accepting connections
- [ ] Can create/read data via API
- [ ] RabbitMQ messages flowing
- [ ] Email notifications working (if configured)

### 4. Monitoring

**Watch for 15-30 minutes:**
- [ ] No errors in logs
- [ ] Memory usage stable
- [ ] CPU usage reasonable
- [ ] No database connection errors
- [ ] No RabbitMQ connection errors

## Rollback Plan

If deployment fails:

1. **Immediate rollback:**
   ```bash
   # In Render dashboard
   - Go to deployment history
   - Click "Rollback" on previous working deployment
   ```

2. **Investigate locally:**
   - Pull failed commit
   - Test Docker build locally
   - Fix issues
   - Redeploy

## Common Issues & Fixes

### Build Failures
- **Missing dependencies**: Check package.json dependencies vs devDependencies
- **TypeScript errors**: Ensure `noEmitOnError: false` in tsconfig
- **Missing files**: Check .gitignore and .dockerignore

### Runtime Failures
- **Database connection**: Verify connection string and network access
- **AMQP connection**: Verify AMQP_URL format and credentials
- **File not found**: Check absolute vs relative paths
- **Auth provider error**: Ensure `localByPass: true` or OIDC configured

### Performance Issues
- **High memory**: Check for memory leaks, increase Render plan
- **Slow startup**: Normal for first cold start, watch for improvement
- **Timeouts**: Increase timeout values, check network latency

## Post-Deployment Tasks

- [ ] Update CORS origins with actual frontend URL
- [ ] Configure custom domain (juicehub.net)
- [ ] Set up monitoring/alerting
- [ ] Document any production-specific configuration
- [ ] Update this checklist with lessons learned

---

**Last Updated:** 2025-12-20
**Maintained By:** JuiceHub Team
