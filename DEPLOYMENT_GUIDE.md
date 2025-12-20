# JuiceHub Deployment Guide

## Current Stack (Demo/MVP)
- **Hosting**: Render.com
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **Message Queue**: CloudAMQP (free tier)

## Future Stack (Production)
- **Cloud**: Azure
- **Communications**: Twilio (SMS/Voice)
- **Email**: SendGrid or Azure Communication Services
- **Database**: Azure Database for PostgreSQL
- **Message Queue**: Azure Service Bus

---

# Phase 1: Deploy to Render + Supabase + Resend

## Prerequisites

1. **GitHub**: Code at https://github.com/player20/JuiceHub
2. **Render Account**: https://render.com (sign up free)
3. **Supabase Account**: https://supabase.com (sign up free)
4. **Resend Account**: https://resend.com (sign up free)
5. **CloudAMQP Account**: https://cloudamqp.com (sign up free)

---

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. **Settings**:
   - **Name**: `juicehub`
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to you (e.g., `us-west-1`)
   - **Plan**: Free (500MB storage, 2GB bandwidth)
4. Wait for project creation (2-3 minutes)

### 1.2 Get Connection Details

1. Go to **Settings** → **Database**
2. Copy these values:
   - **Host**: `db.xxxxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: (your password from step 1.1)
   - **Connection String**: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

### 1.3 Configure Database Settings

1. Go to **Settings** → **Database** → **Connection pooling**
2. Enable **Connection Pooling** (Mode: Transaction)
3. Copy the **Pooler Connection String**:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

---

## Step 2: Set Up CloudAMQP (RabbitMQ)

1. Go to https://customer.cloudamqp.com/
2. Click **"Create New Instance"**
3. **Settings**:
   - **Name**: `juicehub-rabbitmq`
   - **Plan**: Little Lemur (Free)
   - **Region**: Choose same as Supabase
4. Click instance → **AMQP Details**
5. Copy the **URL**: `amqps://xxx:xxx@gull.rmq.cloudamqp.com/xxx`

---

## Step 3: Set Up Resend (Email)

1. Go to https://resend.com/api-keys
2. Click **"Create API Key"**
3. **Settings**:
   - **Name**: `juicehub-production`
   - **Permission**: Full Access or Sending Access
4. Copy the API key: `re_xxxxxxxxxxxxx`
5. **Optional**: Add and verify your domain at https://resend.com/domains

---

## Step 4: Deploy Core Backend on Render

### 4.1 Create Web Service

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. **Connect Repository**: Select `player20/JuiceHub`
4. **Configure**:
   - **Name**: `juicehub-core`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `Core`
   - **Environment**: Docker
   - **Dockerfile Path**: `Server/deploy.Dockerfile`
   - **Plan**: Free (or Starter $7/month for always-on)

### 4.2 Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**, then add:

```env
# Application
PORT=8080
APP_NAME=all
APP_ENV=production
NODE_ENV=production

# Database - Supabase (use Pooler connection string)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
BOOTSTRAP_CITRINEOS_DATABASE_HOST=db.xxxxx.supabase.co
BOOTSTRAP_CITRINEOS_DATABASE_PORT=5432
BOOTSTRAP_CITRINEOS_DATABASE_NAME=postgres
BOOTSTRAP_CITRINEOS_DATABASE_USERNAME=postgres
BOOTSTRAP_CITRINEOS_DATABASE_PASSWORD=[your-supabase-password]
DB_STRATEGY=migrate

# Message Queue - CloudAMQP
AMQP_URL=amqps://xxx:xxx@gull.rmq.cloudamqp.com/xxx

# File Storage (local for demo)
BOOTSTRAP_CITRINEOS_FILE_ACCESS_TYPE=local
BOOTSTRAP_CITRINEOS_FILE_ACCESS_LOCAL_DEFAULT_FILE_PATH=/tmp/citrine
BOOTSTRAP_CITRINEOS_CONFIG_FILENAME=config.json

# AWS Mock (for local storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin

# Email - Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# CORS (will update after frontend deployment)
CORS_ALLOWED_ORIGINS=*

# Optional: Redis (Upstash free tier)
# REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
```

### 4.3 Deploy

1. Click **"Create Web Service"**
2. Wait for build and deployment (5-10 minutes)
3. Monitor logs for any errors
4. **Copy your backend URL**: `https://juicehub-core.onrender.com`
5. Test health endpoint: `https://juicehub-core.onrender.com/health`

---

## Step 5: Deploy Hasura GraphQL

### 5.1 Create Web Service

1. Click **"New +"** → **"Web Service"**
2. **Use Docker Image**: `hasura/graphql-engine:v2.40.3`
3. **Configure**:
   - **Name**: `juicehub-hasura`
   - **Region**: Oregon (US West)
   - **Plan**: Free

### 5.2 Environment Variables

```env
# Database - Same Supabase connection
HASURA_GRAPHQL_DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Console & Dev Mode
HASURA_GRAPHQL_ENABLE_CONSOLE=true
HASURA_GRAPHQL_DEV_MODE=true
HASURA_GRAPHQL_ENABLED_LOG_TYPES=startup,http-log,webhook-log,websocket-log,query-log
HASURA_GRAPHQL_ENABLE_TELEMETRY=false

# Security (set for production)
HASURA_GRAPHQL_ADMIN_SECRET=your-secret-key-here
HASURA_GRAPHQL_UNAUTHORIZED_ROLE=anonymous
```

### 5.3 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (2-3 minutes)
3. **Copy your GraphQL URL**: `https://juicehub-hasura.onrender.com`
4. Access console: `https://juicehub-hasura.onrender.com/console`

---

## Step 6: Deploy OperatorUI Frontend

### 6.1 Create Static Site

1. Click **"New +"** → **"Static Site"**
2. **Connect Repository**: `player20/JuiceHub`
3. **Configure**:
   - **Name**: `juicehub-ui`
   - **Branch**: `main`
   - **Root Directory**: `OperatorUI`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: Free (static sites are always free)

### 6.2 Environment Variables

```env
# Backend URLs (use your actual Render URLs)
VITE_API_URL=https://juicehub-core.onrender.com
VITE_GRAPHQL_URL=https://juicehub-hasura.onrender.com/v1/graphql
VITE_WS_URL=wss://juicehub-core.onrender.com
VITE_TENANT_ID=1

# Optional: Google Maps API
# VITE_GOOGLE_MAPS_API_KEY=your-api-key
```

### 6.3 Deploy

1. Click **"Create Static Site"**
2. Wait for build (3-5 minutes)
3. **Your demo is live!** `https://juicehub-ui.onrender.com`

---

## Step 7: Post-Deployment Configuration

### 7.1 Update CORS on Backend

Go to Core backend settings and update:
```env
CORS_ALLOWED_ORIGINS=https://juicehub-ui.onrender.com
```

Then click **"Manual Deploy"** → **"Deploy latest commit"**

### 7.2 Configure Hasura Metadata

1. Open Hasura Console: `https://juicehub-hasura.onrender.com/console`
2. Go to **Data** tab
3. Click **"Track All"** to track CitrineOS tables
4. Go to **Settings** → **Metadata** to view all tracked resources

### 7.3 Test the Deployment

1. **Frontend**: Open `https://juicehub-ui.onrender.com`
2. **Backend Health**: `https://juicehub-core.onrender.com/health`
3. **GraphQL**: `https://juicehub-hasura.onrender.com/console`
4. **OCPP WebSocket**: `wss://juicehub-core.onrender.com/ocpp/test-station-001`

### 7.4 Set Up Email Notifications (Optional)

Create a file `Core/Server/src/services/email.service.ts`:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendStationOfflineAlert(
  stationId: string,
  email: string
) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@juicehub.com',
    to: email,
    subject: `Alert: Charging Station ${stationId} is Offline`,
    html: `
      <h2>Station Offline Alert</h2>
      <p>Charging station <strong>${stationId}</strong> has gone offline.</p>
      <p>Please check the station immediately.</p>
    `,
  });
}
```

---

## Architecture Diagram (Current)

```
┌─────────────────────────────────────────────────────────┐
│                     Render.com                          │
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │ OperatorUI   │      │ Core Backend │               │
│  │ (Static)     │─────▶│ (Docker)     │               │
│  │ :443         │      │ :8080        │               │
│  └──────────────┘      └──────┬───────┘               │
│                               │                        │
│  ┌──────────────┐             │                        │
│  │ Hasura       │◀────────────┘                        │
│  │ GraphQL      │                                      │
│  │ :8080        │                                      │
│  └──────┬───────┘                                      │
└─────────┼──────────────────────────────────────────────┘
          │
          │ PostgreSQL Connection
          ▼
┌─────────────────┐
│   Supabase      │
│   PostgreSQL    │
│   :5432         │
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│   CloudAMQP     │         │    Resend       │
│   RabbitMQ      │         │    Email API    │
│   :5672         │         │                 │
└─────────────────┘         └─────────────────┘
```

---

## Cost Breakdown (Current)

| Service | Plan | Cost |
|---------|------|------|
| Render - Core Backend | Free | $0/mo |
| Render - Hasura | Free | $0/mo |
| Render - OperatorUI | Free | $0/mo |
| Supabase Database | Free | $0/mo |
| CloudAMQP RabbitMQ | Free | $0/mo |
| Resend Email | Free | $0/mo |
| **Total** | | **$0/mo** |

### Free Tier Limits
- **Render**: Services sleep after 15 min inactivity
- **Supabase**: 500MB database, 2GB bandwidth
- **CloudAMQP**: 1 connection, 10k messages/month
- **Resend**: 100 emails/day, 1 domain

---

## Upgrade Path (For Production)

### Phase 2: Paid Render + Supabase ($15-25/mo)

```env
Render Core: Starter ($7/mo) - Always on
Render Hasura: Starter ($7/mo)
Supabase: Pro ($25/mo) - More storage & performance
Resend: Pro ($20/mo) - 50k emails/month
Total: ~$59/mo
```

### Phase 3: Azure Migration (Production)

```
Azure App Service (Core): ~$50/mo
Azure Database for PostgreSQL: ~$150/mo
Azure Service Bus: ~$10/mo
Azure CDN (Frontend): ~$5/mo
Twilio (SMS): Pay-as-you-go
SendGrid (Email): ~$15/mo
Total: ~$230/mo
```

---

## Monitoring & Alerts

### Set Up Uptime Monitoring (Free)

1. Sign up for UptimeRobot: https://uptimerobot.com
2. Add monitors:
   - `https://juicehub-ui.onrender.com` (every 5 min)
   - `https://juicehub-core.onrender.com/health` (every 5 min)
   - `https://juicehub-hasura.onrender.com/healthz` (every 5 min)
3. Configure alerts via email

---

## Troubleshooting

### Services won't start
- Check Render logs in dashboard
- Verify all environment variables are set
- Ensure Supabase connection string is correct

### Database connection failed
- Verify Supabase password
- Use Pooler connection string (port 6543)
- Check Supabase is not paused

### Frontend shows blank page
- Check browser console for errors
- Verify VITE_API_URL and VITE_GRAPHQL_URL
- Clear browser cache

### OCPP chargers can't connect
- Verify WebSocket URL: `wss://juicehub-core.onrender.com/ocpp/{id}`
- Check CORS settings
- Ensure backend is awake (free tier sleeps)

---

## Next Steps

✅ **Demo deployed and running!**

Now you can:
1. Connect real charging stations
2. Test CSV exports
3. Monitor uptime status
4. Configure email alerts
5. Plan Azure migration

**Your live demo**: `https://juicehub-ui.onrender.com`

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Resend Docs**: https://resend.com/docs
- **JuiceHub GitHub**: https://github.com/player20/JuiceHub
- **CitrineOS Docs**: https://citrineos.github.io/

🚀 **Happy deploying!**
