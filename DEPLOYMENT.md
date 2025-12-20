# JuiceHub Deployment Guide

Complete guide for deploying JuiceHub to production on Render.com.

## Architecture

```
JuiceHub Production Stack:
├── juicehub-core (Render Web Service) - OCPP Backend
├── juicehub-hasura (Render Web Service) - GraphQL API
├── juicehub-ui (Render Static Site) - Operator Dashboard
├── Supabase (External) - PostgreSQL Database
├── CloudAMQP (External) - RabbitMQ Message Queue
└── Resend (External) - Email Service
```

## Required Environment Variables

### Database (Supabase)
| Variable | Description | Example |
|----------|-------------|---------|
| `BOOTSTRAP_CITRINEOS_DATABASE_HOST` | Supabase host | `db.xxxxx.supabase.co` |
| `BOOTSTRAP_CITRINEOS_DATABASE_PORT` | Port | `5432` |
| `BOOTSTRAP_CITRINEOS_DATABASE_NAME` | Database name | `postgres` |
| `BOOTSTRAP_CITRINEOS_DATABASE_USER` | Username | `postgres` |
| `BOOTSTRAP_CITRINEOS_DATABASE_PASSWORD` | Password | `your-password` |
| `DATABASE_URL` | Full connection string | `postgres://...` |

### Message Queue (CloudAMQP)
| Variable | Description | Example |
|----------|-------------|---------|
| `AMQP_URL` | CloudAMQP connection URL | `amqps://user:pass@host/vhost` |

### File Storage
| Variable | Description | Default |
|----------|-------------|---------|
| `BOOTSTRAP_CITRINEOS_FILE_ACCESS_TYPE` | Storage type | `local` |
| `BOOTSTRAP_CITRINEOS_FILE_ACCESS_LOCAL_DEFAULT_FILE_PATH` | Storage path | `/tmp/citrine` |
| `BOOTSTRAP_CITRINEOS_CONFIG_FILENAME` | Config file | `config.json` |

### Email (Resend)
| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key | `re_xxxxxxxxxxxx` |
| `EMAIL_FROM` | From address | `noreply@juicehub.com` |

### Security Settings
| Variable | Description | Recommended |
|----------|-------------|-------------|
| `NODE_ENV` | Environment | `production` |
| `ALLOW_UNKNOWN_CHARGERS` | Allow unknown chargers | `false` |
| `ACME_ENV` | Certificate authority env | `staging` |
| `ACME_EMAIL` | Admin email for certs | `admin@juicehub.net` |

### Application
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `8080` |
| `APP_NAME` | Module to run | `all` |
| `APP_ENV` | App environment | `docker` |
| `DB_STRATEGY` | Database init strategy | `migrate` |

## Deployment Process

### 1. First-Time Setup

#### External Services
1. **Supabase**: Create project, get connection details
2. **CloudAMQP**: Create instance, get AMQP URL
3. **Resend**: Create account, get API key

#### Render.com Setup
1. Fork/clone JuiceHub repository
2. Connect GitHub to Render
3. Create New Blueprint
4. Select `render.yaml` from repository
5. Set environment variables in Render dashboard

### 2. Configure Environment Variables

In Render dashboard for `juicehub-core`:
1. Navigate to Environment tab
2. Set all required variables from table above
3. Ensure sensitive values use "Secret" type
4. Save changes (triggers redeploy)

### 3. Deploy

**Automatic Deployment:**
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

Render automatically:
1. Detects push to main
2. Builds Docker image
3. Runs migrations
4. Starts application
5. Health checks pass
6. Switches traffic to new deployment

### 4. Verify Deployment

**Check Render Dashboard:**
- Service status: "Live" (green)
- Latest deploy: Successful
- Logs: No errors

**Test Endpoints:**
```bash
# Health check
curl https://juicehub-core.onrender.com/health

# API docs
open https://juicehub-core.onrender.com/docs

# WebSocket (OCPP 2.0.1, security profile 0)
wscat -c ws://juicehub-core.onrender.com:8081
```

## Local Testing Before Deploy

### Build Validation
```bash
# Clean build
cd Core
npm run clean
npm run build

# Validate environment
cd Server
npx ts-node src/validateEnv.ts
```

### Docker Build Test
```bash
cd Core
docker build -f Server/deploy.Dockerfile -t juicehub-test .

# Test run with your production env vars
docker run --env-file ../.env.production -p 8080:8080 juicehub-test
```

### Local Smoke Test
```bash
# Start with production-like config
docker-compose up

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/docs
```

## Database Management

### Migrations
Migrations run automatically on deployment via `entrypoint.sh`:
```bash
npm run migrate  # Runs Sequelize migrations
```

### Manual Migration (if needed)
```bash
# In Render shell
npm run migrate
```

### Database Strategies
Set via `DB_STRATEGY` environment variable:
- `migrate` (default): Run migrations only
- `sync`: Synchronize schema (non-destructive)
- `force-sync`: Force sync (DESTRUCTIVE - drops tables!)
- `none`: Skip database initialization

## Troubleshooting

### Build Failures

**"Cannot find module 'typescript'"**
- Fix: Ensure `typescript` in `dependencies`, not `devDependencies`
- File: `Core/package.json`

**"Missing JSON schema files"**
- Fix: Ensure `build.mjs` copies JSON files
- Check: `dist/**/*.json` files exist after build

**"Certificate files not found"**
- Fix: Ensure `.gitignore` whitelists certificate files
- Check: `git ls-files Core/Server/src/assets/certificates/`

### Runtime Failures

**"AMQP connection failed"**
- Check: `AMQP_URL` environment variable set correctly
- Verify: CloudAMQP instance is running
- Test: Connection from Render's region

**"Database connection failed"**
- Check: All `BOOTSTRAP_CITRINEOS_DATABASE_*` variables set
- Verify: Supabase allows connections from Render IPs
- Test: Connection string with `psql`

**"Auth provider implementation must be set"**
- Fix: Ensure `authProvider.localByPass: true` OR configure OIDC
- This is normal if not using OIDC authentication

**"File path ENOENT"**
- Check: File paths are absolute, not relative
- Verify: Directories created in `entrypoint.sh`
- Example: Use `/tmp/citrine` not `./tmp/citrine`

### Performance Issues

**Slow Cold Starts**
- Normal: First request after idle takes 30-60s
- Solution: Upgrade to paid plan for always-on service

**Memory Errors**
- Check: Render plan memory limits
- Solution: Upgrade plan or optimize memory usage

**Timeout Errors**
- Check: Render timeout settings
- Increase: `maxCallLengthSeconds` in config

## Monitoring

### Application Logs
```bash
# In Render dashboard
Services → juicehub-core → Logs

# Or via Render CLI
render logs -s juicehub-core --tail
```

### Health Monitoring
```bash
# Set up external monitoring
curl https://juicehub-core.onrender.com/health
```

### Database Monitoring
- Supabase dashboard for query performance
- Connection pool usage
- Slow query log

### Message Queue Monitoring
- CloudAMQP dashboard for queue depths
- Message rates
- Connection status

## Rollback Procedure

### Via Render Dashboard
1. Go to Deployments tab
2. Find last working deployment
3. Click "Rollback to this deploy"
4. Confirm rollback

### Via Git
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or hard reset (if safe)
git reset --hard HEAD~1
git push -f origin main
```

## Scaling

### Horizontal Scaling
- Render: Add more instances in dashboard
- Configure: Load balancer settings
- Note: Stateless design required

### Vertical Scaling
- Render: Upgrade service plan
- More CPU/memory per instance

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to git
   - Use Render's "Secret" type for sensitive values
   - Rotate credentials regularly

2. **Network Security**
   - Use HTTPS for all production traffic
   - Configure CORS appropriately
   - Block unknown charging stations in production

3. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Restrict network access

4. **OCPP Security**
   - Use security profiles 2-3 for production
   - Require valid certificates
   - Use mTLS for critical infrastructure

## Maintenance

### Regular Tasks
- [ ] Review and rotate credentials quarterly
- [ ] Update dependencies monthly
- [ ] Review logs weekly
- [ ] Test backups weekly
- [ ] Performance review monthly

### Updates
```bash
# Update dependencies
npm update

# Test locally
npm run build
npm test

# Deploy
git commit -am "Update dependencies"
git push
```

## Support

### Documentation
- CitrineOS: https://github.com/citrineos/citrineos-core
- Render: https://render.com/docs
- OCPP: https://www.openchargealliance.org/

### Getting Help
- GitHub Issues: https://github.com/player20/JuiceHub/issues
- Render Support: https://render.com/support
- Team Slack: [Your team channel]

---

**Last Updated:** 2025-12-20
**Version:** 1.0.0
