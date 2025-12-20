# Deploy JuiceHub to Render.com

## Quick Start (Free Demo Deployment)

This guide will help you deploy JuiceHub as a live demo using Render.com's free tier and free external services.

### Prerequisites

1. **Render.com Account** - Sign up at https://render.com
2. **GitHub Account** - Your code is already at https://github.com/player20/JuiceHub

---

## Option 1: Free Demo Deployment (Recommended for Testing)

Uses free external services to keep costs at $0/month.

### Step 1: Set Up External Services

#### 1.1 PostgreSQL Database (ElephantSQL - Free)

1. Go to https://www.elephantsql.com/
2. Sign up and create a new instance
3. Choose "Tiny Turtle" (Free plan)
4. Name it: `juicehub-db`
5. Copy the connection URL (looks like: `postgres://user:pass@host/database`)

#### 1.2 RabbitMQ (CloudAMQP - Free)

1. Go to https://www.cloudamqp.com/
2. Sign up and create a new instance
3. Choose "Little Lemur" (Free plan)
4. Name it: `juicehub-rabbitmq`
5. Copy the AMQP URL (looks like: `amqps://user:pass@host/vhost`)

#### 1.3 Redis (Upstash - Free)

1. Go to https://upstash.com/
2. Sign up and create a Redis database
3. Choose "Free" plan
4. Name it: `juicehub-redis`
5. Copy the Redis URL (looks like: `redis://default:pass@host:port`)

### Step 2: Deploy Core Backend to Render

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New +"** → **"Web Service"**
3. **Connect Repository**: `https://github.com/player20/JuiceHub`
4. **Configure Service**:
   - **Name**: `juicehub-core`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `Core`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Server/deploy.Dockerfile`
   - **Plan**: `Free`

5. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):

```env
# Application
PORT=8080
APP_NAME=all
APP_ENV=production
NODE_ENV=production

# Database (paste your ElephantSQL URL)
DATABASE_URL=postgres://user:pass@host/database
BOOTSTRAP_CITRINEOS_DATABASE_HOST=<from ElephantSQL>
DB_STRATEGY=migrate

# RabbitMQ (paste your CloudAMQP URL)
AMQP_URL=amqps://user:pass@host/vhost

# Redis (paste your Upstash URL)
REDIS_URL=redis://default:pass@host:port

# File Storage (use local for demo)
BOOTSTRAP_CITRINEOS_FILE_ACCESS_TYPE=local
BOOTSTRAP_CITRINEOS_FILE_ACCESS_LOCAL_DEFAULT_FILE_PATH=/tmp/citrine
BOOTSTRAP_CITRINEOS_CONFIG_FILENAME=config.json

# AWS (placeholder for local storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin

# CORS (will set after frontend deployment)
CORS_ALLOWED_ORIGINS=*
```

6. **Click "Create Web Service"**
7. **Wait for deployment** (5-10 minutes)
8. **Copy your backend URL**: `https://juicehub-core.onrender.com`

### Step 3: Deploy Hasura GraphQL

1. **Click "New +"** → **"Web Service"**
2. **Use Docker Image**:
   - **Image URL**: `hasura/graphql-engine:v2.40.3`
   - **Name**: `juicehub-hasura`
   - **Plan**: `Free`

3. **Environment Variables**:

```env
# Database (same as Core backend)
HASURA_GRAPHQL_DATABASE_URL=postgres://user:pass@host/database

# Configuration
HASURA_GRAPHQL_ENABLE_CONSOLE=true
HASURA_GRAPHQL_DEV_MODE=true
HASURA_GRAPHQL_ENABLED_LOG_TYPES=startup,http-log,webhook-log,websocket-log,query-log
HASURA_GRAPHQL_ENABLE_TELEMETRY=false

# Admin Secret (optional for demo)
# HASURA_GRAPHQL_ADMIN_SECRET=your-secret-here
```

4. **Click "Create Web Service"**
5. **Copy your GraphQL URL**: `https://juicehub-hasura.onrender.com`

### Step 4: Deploy OperatorUI Frontend

1. **Click "New +"** → **"Static Site"**
2. **Connect Repository**: `https://github.com/player20/JuiceHub`
3. **Configure**:
   - **Name**: `juicehub-ui`
   - **Branch**: `main`
   - **Root Directory**: `OperatorUI`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:

```env
# Backend URLs (update with your actual Render URLs)
VITE_API_URL=https://juicehub-core.onrender.com
VITE_GRAPHQL_URL=https://juicehub-hasura.onrender.com
VITE_WS_URL=wss://juicehub-core.onrender.com
VITE_TENANT_ID=1
```

5. **Click "Create Static Site"**
6. **Wait for build** (3-5 minutes)
7. **Your demo is live!** `https://juicehub-ui.onrender.com`

---

## Option 2: Paid Deployment (Production-Ready)

For a production deployment with better performance and reliability.

### Cost Estimate

- **Core Backend**: Render Starter ($7/month)
- **Hasura GraphQL**: Render Starter ($7/month)
- **PostgreSQL**: Render Starter ($7/month)
- **RabbitMQ**: CloudAMQP Lemur ($19/month) or Render Private Service ($7/month)
- **Redis**: Upstash Pay-as-you-go (~$1/month)
- **Frontend**: Free (static site)

**Total**: ~$22-49/month

### Deploy with Blueprint

1. Make sure all services in `render.yaml` are configured
2. Go to Render Dashboard
3. Click "New +" → "Blueprint"
4. Connect repository: `https://github.com/player20/JuiceHub`
5. Render will automatically create all services from `render.yaml`

---

## Post-Deployment Configuration

### Update CORS Settings

After deploying, update the Core backend environment variables:

```env
CORS_ALLOWED_ORIGINS=https://juicehub-ui.onrender.com
```

### Apply Hasura Metadata

1. Open Hasura Console: `https://juicehub-hasura.onrender.com`
2. Go to **Data** tab
3. Track all tables automatically
4. Configure permissions as needed

### Test OCPP Connection

Your charging stations can connect to:
```
wss://juicehub-core.onrender.com/ocpp/{stationId}
```

---

## Important Notes

### Free Tier Limitations

- **Services sleep after 15 minutes** of inactivity
- **Cold start takes 30-60 seconds** when service wakes up
- **Not suitable for production** use with real chargers
- **Monthly usage limits** apply

### Upgrading to Paid

To upgrade for production:
1. Change service plans from "Free" to "Starter"
2. Use managed PostgreSQL instead of ElephantSQL
3. Add persistent disk storage
4. Configure custom domain
5. Set up monitoring and alerts

### Security Recommendations

For production deployment:
1. **Set strong passwords** for all services
2. **Enable HASURA_GRAPHQL_ADMIN_SECRET**
3. **Configure proper CORS origins**
4. **Use SSL/TLS for all connections**
5. **Set up rate limiting**
6. **Enable logging and monitoring**

---

## Troubleshooting

### Backend won't start

- Check environment variables are set correctly
- Verify database connection URL
- Look at deployment logs in Render dashboard

### Frontend shows errors

- Verify VITE_API_URL points to your backend
- Check CORS settings on backend
- Clear browser cache and reload

### Database connection failed

- Verify ElephantSQL instance is running
- Check connection URL format
- Ensure database allows connections from Render IPs

### Service sleeping

- Free tier services sleep after 15 min inactivity
- Consider upgrading to paid plan
- Or use a service like UptimeRobot to ping every 14 minutes

---

## Next Steps

Once deployed:

1. ✅ **Access your demo**: `https://juicehub-ui.onrender.com`
2. ✅ **GraphQL Console**: `https://juicehub-hasura.onrender.com`
3. ✅ **Connect charging stations**: `wss://juicehub-core.onrender.com/ocpp/{id}`
4. ✅ **Monitor logs**: Render Dashboard → Your Service → Logs
5. ✅ **Custom domain** (optional): Render Dashboard → Settings → Custom Domain

---

## Support

- **Render Docs**: https://render.com/docs
- **JuiceHub Issues**: https://github.com/player20/JuiceHub/issues
- **CitrineOS Docs**: https://citrineos.github.io/

---

**Your JuiceHub demo will be live at**: `https://juicehub-ui.onrender.com`

All services auto-deploy on git push to `main` branch! 🚀
