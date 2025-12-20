# CitrineOS Setup Guide for JuiceNet Integration

## Quick Start - Development Environment

### Prerequisites
- Docker and Docker Compose installed
- At least 8GB RAM available for Docker

### Start Services

```bash
cd /Users/jakesanch/citrine/citrineos-core/Server
docker-compose up -d
```

### Verify Services Running

```bash
docker-compose ps
```

Expected services:
- `citrine` - CitrineOS Core (http://localhost:8080)
- `ocpp-db` - PostgreSQL Database (localhost:5432)
- `amqp-broker` - RabbitMQ (http://localhost:15672, guest/guest)
- `graphql-engine` - Hasura GraphQL (http://localhost:8090)
- `minio` - File Storage (http://localhost:9001, minioadmin/minioadmin)

### Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| CitrineOS API | http://localhost:8080 | N/A |
| Hasura GraphQL Console | http://localhost:8090 | No auth (dev mode) |
| RabbitMQ Management | http://localhost:15672 | guest / guest |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5432 | citrine / citrine |

### OCPP WebSocket Endpoint (Development)

Chargers should connect to:
```
ws://localhost:8080/ocpp/{stationId}
```

Example:
```
ws://localhost:8080/ocpp/JN-JUICEBOX-1702900000000-ABC123
```

Supported subprotocols: `ocpp1.6`, `ocpp2.0`, `ocpp2.0.1`

### Database Access

Connect to PostgreSQL:
```bash
docker exec -it server-ocpp-db-1 psql -U citrine -d citrine
```

View tables:
```sql
\dt
```

Key tables for JuiceNet integration:
- `ChargingStation` - Connected chargers
- `Transaction` - Charging sessions
- `MeterValue` - Real-time energy data
- `MessageInfo` - OCPP message log

### Hasura GraphQL Queries

Open Hasura Console: http://localhost:8090

Example query to list charging stations:
```graphql
query ListChargingStations {
  ChargingStation {
    id
    stationId
    chargePointModel
    chargePointVendor
    status
    lastHeartbeat
  }
}
```

### Logs

View CitrineOS logs:
```bash
docker-compose logs -f citrine
```

View specific service:
```bash
docker-compose logs -f ocpp-db
docker-compose logs -f amqp-broker
docker-compose logs -f graphql-engine
```

### Stop Services

```bash
docker-compose down
```

Keep data (volumes):
```bash
docker-compose down
```

Clean everything (including data):
```bash
docker-compose down -v
rm -rf ./data
```

---

## Production Configuration

### Environment Variables for Production

Create `/Users/jakesanch/citrine/citrineos-core/Server/.env.production`:

```env
# Database
DB_HOST=postgres.juicenet.internal
DB_PORT=5432
DB_NAME=citrineos
DB_USER=citrine
DB_PASS=<from Azure Key Vault>

# RabbitMQ
RABBITMQ_URL=amqp://rabbitmq.juicenet.internal:5672
RABBITMQ_USER=citrine
RABBITMQ_PASS=<from Azure Key Vault>

# Hasura
HASURA_GRAPHQL_ADMIN_SECRET=<from Azure Key Vault>
HASURA_GRAPHQL_JWT_SECRET=<from Keycloak>

# AWS/Azure (for file storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from Azure Key Vault>
AWS_SECRET_ACCESS_KEY=<from Azure Key Vault>
```

### DNS Mapping (Production)

| DNS | Target | Port |
|-----|--------|------|
| ocpp.juicenet.ai | CitrineOS WebSocket | 9000 |
| citrine.juicenet.ai | CitrineOS REST API | 8080 |
| citrine-graphql.juicenet.ai | Hasura GraphQL | 8090 |
| operator.juicenet.ai | Operator UI | 3000 |

---

## Next Steps

1. ✅ Development environment running
2. ⏳ Integrate with JuiceNet API (Phase 2)
3. ⏳ Update JuiceNet App (Phase 3)
4. ⏳ Customize Operator UI (Phase 4)
5. ⏳ Deploy to Azure (Phase 5)
6. ⏳ Testing & validation (Phase 6)

---

## Troubleshooting

### Port Already in Use

If port 5432, 8080, 8090, or 15672 is already in use:

```bash
# Find process using port
lsof -i :8080

# Kill process (replace PID)
kill -9 <PID>
```

Or modify ports in `docker-compose.yml`:
```yaml
ports:
  - "58080:8080"  # Changed from 8080:8080
```

### Database Connection Issues

Reset database:
```bash
docker-compose down -v
docker volume rm server_ocpp-db
docker-compose up -d
```

### Container Won't Start

Check logs:
```bash
docker-compose logs citrine
```

Rebuild containers:
```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## Contact

For JuiceNet-specific integration questions, contact the development team.
