# JuiceHub Developer Guide

**Version:** 1.0
**Last Updated:** December 2025
**Target Audience:** Backend developers, DevOps engineers, Platform contributors

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Overview](#component-overview)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [WebSocket Communication](#websocket-communication)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Common Issues & Debugging](#common-issues--debugging)
8. [Extending the Platform](#extending-the-platform)
9. [Environment Configuration](#environment-configuration)
10. [Testing Guidelines](#testing-guidelines)

---

## System Architecture

### High-Level Overview

```
┌─────────────────┐
│   Mobile App    │  (Your React Native App)
│  - Reservations │  - Handles user bookings
│  - Payments     │  - Peak/off-peak pricing
│  - User Auth    │  - Guest management
└────────┬────────┘
         │ HTTP/GraphQL
         ▼
┌─────────────────────────────────────────────────────────┐
│              JuiceHub Platform (This Repo)              │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ OperatorUI   │  │   Core       │  │   Hasura     │ │
│  │ (React)      │  │ (OCPP Server)│  │  (GraphQL)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │          │
│         └────────GraphQL──┴──────────────────┘          │
│                           │                             │
│                           │ WebSocket (OCPP)            │
└───────────────────────────┼─────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  EV Chargers   │
                   │  (OCPP 1.6/2.0)│
                   └────────────────┘
```

### Component Responsibilities

| Component | Purpose | Technology | Port |
|-----------|---------|------------|------|
| **Core** | OCPP server, handles charger communication | Node.js, TypeScript, CitrineOS | 8080, 8081, 9229 |
| **OperatorUI** | Admin interface for charger management | React, TypeScript, Vite | 5173 (dev) |
| **Hasura** | GraphQL API layer over PostgreSQL | Hasura Engine | 8082 |
| **PostgreSQL** | Primary database | PostgreSQL 14+ | 5432 |
| **RabbitMQ** | Message queue for async operations | RabbitMQ | 5672, 15672 |

---

## Component Overview

### Core OCPP Server (`Core/`)

The heart of the system - handles all OCPP protocol communication with EV chargers.

**Key Modules:**

```
Core/
├── 00_Base/          # Shared types, interfaces, OCPP models
├── 01_Data/          # Database models, repositories, migrations
├── 02_Util/          # Utilities, auth, message queue
├── 03_Modules/       # Feature modules (EVDriver, SmartCharging, etc.)
└── Server/           # HTTP & WebSocket server entry points
```

**Feature Modules:**

1. **EVDriver** (`03_Modules/EVDriver/`)
   - Handles: Authorize, StartTransaction, StopTransaction
   - Critical for: Authorization enforcement, transaction lifecycle
   - Entry point: `module/module.ts` → `_handleOCPP16Authorize()`

2. **SmartCharging** (`03_Modules/SmartCharging/`)
   - Handles: SetChargingProfile, GetChargingProfiles
   - Critical for: Power/energy limits, time-based charging control
   - Entry point: `module/module.ts`, `2.0.1/MessageApi.ts`

3. **Configuration** (`03_Modules/Configuration/`)
   - Handles: ChangeAvailability, ChangeConfiguration, GetConfiguration
   - Critical for: Charger settings, availability control
   - Entry point: `module/module.ts`

4. **Monitoring** (`03_Modules/Monitoring/`)
   - Handles: StatusNotification, MeterValues, Heartbeat
   - Critical for: Real-time status, energy metering
   - Entry point: `module/module.ts`

### Database Layer (`01_Data/`)

**ORM:** Sequelize
**Migrations:** Located in `01_Data/src/layers/sequelize/migrations/`

**Critical Tables:**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ChargingStations` | Charger registry | `id`, `isOnline`, `protocol`, `firmwareVersion` |
| `Connectors` | Charging ports | `stationId`, `connectorId`, `status` |
| `Authorizations` | User access tokens | `idToken`, `status`, `cacheExpiryDateTime` |
| `Transactions` | Charging sessions | `transactionId`, `totalKwh`, `isActive` |
| `OCPPMessages` | Message log | `stationId`, `action`, `message` |
| `Reservations` | Time-slot bookings | `stationId`, `evseId`, `expiryDateTime` |
| `Tariffs` | Pricing rules | `pricePerKwh`, `flatFee`, `validFrom` |

**Relationships:**
- `ChargingStations` → `Connectors` (1:N)
- `ChargingStations` → `Transactions` (1:N)
- `Transactions` → `Authorizations` (N:1 via idToken)

### OperatorUI (`OperatorUI/`)

React-based admin interface.

**Key Pages:**
- `/charging-stations` - Charger list and details
- `/charging-stations/:id` - Individual charger management
  - Live Stats tab (shows active sessions)
  - Connectors tab (connector status)

**GraphQL Queries:** `src/pages/charging-stations/queries.ts`

---

## Database Schema

### Critical Fields Explained

#### `Authorizations` Table

```typescript
{
  idToken: string;              // Unique token (RFID card, app token)
  status: AuthorizationStatusType;  // "Accepted" | "Blocked" | "Expired" | "Invalid"
  cacheExpiryDateTime: string | null;  // ISO 8601 - when token expires
  chargingPriority: number | null;     // Higher = more priority (homeowner > guest)
  tenantId: number;              // Multi-tenancy support
}
```

**Business Logic:**
- If `status = "Accepted"` AND `cacheExpiryDateTime > now()` → Allow charging
- If `cacheExpiryDateTime < now()` → Return "Expired" status
- If no matching `idToken` → Return "Invalid" status

#### `Transactions` Table

```typescript
{
  transactionId: string;         // OCPP transaction ID
  stationId: string;             // Which charger
  isActive: boolean;             // Currently charging?
  totalKwh: number;              // Energy delivered
  timeSpentCharging: number;     // Duration in seconds
  startTime: string;             // ISO 8601 timestamp
  stopTime: string | null;       // ISO 8601 timestamp (null if active)
}
```

---

## API Reference

### REST API Endpoints

**Base URL:** `https://juicehub-core.onrender.com`

#### Configuration Module

```http
POST /ocpp/1.6/configuration/changeAvailability?identifier={stationId}&tenantId={tenantId}
Content-Type: application/json

{
  "connectorId": 1,
  "type": "Operative" | "Inoperative"
}
```

**Response:**
```json
[{"success": true}]
```

**Use Case:** Make charger available/unavailable for reservations

---

#### Smart Charging Module (OCPP 2.0.1)

```http
POST /ocpp/2.0.1/smartcharging/setChargingProfile?identifier={stationId}&tenantId={tenantId}
Content-Type: application/json

{
  "evseId": 0,
  "chargingProfile": {
    "id": 999,
    "stackLevel": 0,
    "chargingProfilePurpose": "ChargingStationMaxProfile",
    "chargingProfileKind": "Absolute",
    "chargingSchedule": [{
      "id": 1,
      "startSchedule": "2025-12-23T14:00:00Z",
      "chargingRateUnit": "W",
      "chargingSchedulePeriod": [{
        "startPeriod": 0,
        "limit": 7400
      }]
    }]
  }
}
```

**Common Error:**
```json
{
  "success": false,
  "payload": "No connection found for identifier: 1:WALLBOX-HOME-001"
}
```

**Cause:** WebSocket connection not established (see [Debugging WebSocket Issues](#debugging-websocket-issues))

---

### GraphQL API (Hasura)

**Endpoint:** `https://juicehub-hasura.onrender.com/v1/graphql`
**Auth:** `x-hasura-admin-secret: {HASURA_GRAPHQL_ADMIN_SECRET}`

#### Query: Get Charger Status

```graphql
query GetChargerStatus($stationId: String!) {
  ChargingStations(where: {id: {_eq: $stationId}}) {
    id
    isOnline
    firmwareVersion
    chargePointVendor
    chargePointModel
  }
  Connectors(where: {stationId: {_eq: $stationId}}) {
    connectorId
    status
    type
    maximumPowerWatts
  }
}
```

#### Mutation: Create Authorization Token

```graphql
mutation CreateGuestAuth($idToken: String!, $expiryDate: timestamptz!) {
  insert_Authorizations_one(object: {
    idToken: $idToken,
    tenantId: 1,
    status: "Accepted",
    cacheExpiryDateTime: $expiryDate,
    chargingPriority: 5
  }) {
    id
    idToken
    cacheExpiryDateTime
  }
}
```

**Example Variables:**
```json
{
  "idToken": "GUEST-RESERVATION-42",
  "expiryDate": "2025-12-23T15:00:00Z"
}
```

---

## WebSocket Communication

### OCPP Protocol Flow

**Charger → Server (Always Works):**
```
1. Charger connects: wss://juicehub-core.onrender.com/ocpp
2. Sends BootNotification
3. Server responds with currentTime, interval, status
4. Charger sends Heartbeat every ~20s
5. Charger sends StatusNotification on state change
6. Charger sends MeterValues during charging
```

**Server → Charger (May Not Work):**
```
1. Server sends OCPP command (RemoteStop, ChangeAvailability, etc.)
2. ❌ ERROR: "No connection found for identifier"
3. Root cause: WebSocket session not registered for outbound communication
```

### OCPP Message Format

**OCPP 1.6 uses JSON array format:**

```json
[MessageTypeId, UniqueId, Action, Payload]
```

**Example - Authorize Request:**
```json
[2, "123456", "Authorize", {"idTag": "GUEST-001"}]
```

**Example - Authorize Response:**
```json
[3, "123456", {"idTagInfo": {"status": "Accepted", "expiryDate": "2025-12-23T15:00:00Z"}}]
```

**Message Types:**
- `2` = CALL (request from charger or server)
- `3` = CALLRESULT (response)
- `4` = CALLERROR (error response)

---

## Error Handling Patterns

### Current State (Needs Improvement)

**Problem:** Basic error handling with minimal context

```typescript
// Current pattern (not ideal)
try {
  const result = await repository.readAll(tenantId, query);
  if (!result) {
    this._logger.error('No result found');
    return defaultResponse;
  }
} catch (error) {
  this._logger.error('Operation failed:', error);
  // Returns generic error
}
```

### Recommended Pattern

```typescript
// Improved pattern with structured errors
try {
  const result = await repository.readAll(tenantId, query);

  if (!result || result.length === 0) {
    this._logger.warn('Resource not found', {
      tenantId,
      query,
      context: 'AuthorizationLookup'
    });
    return {
      success: false,
      errorCode: 'RESOURCE_NOT_FOUND',
      message: 'No authorization found for the provided idToken',
      details: { idToken: query.idToken }
    };
  }

  return { success: true, data: result };

} catch (error) {
  this._logger.error('Database operation failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    tenantId,
    operation: 'readAll',
    context: 'AuthorizationRepository'
  });

  return {
    success: false,
    errorCode: 'DATABASE_ERROR',
    message: 'Failed to retrieve authorization data',
    details: { originalError: error instanceof Error ? error.message : String(error) }
  };
}
```

### Error Response Structure

All API responses should follow this format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp?: string;
  };
}
```

**Error Codes:**
- `RESOURCE_NOT_FOUND` - Entity doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `DATABASE_ERROR` - Database operation failed
- `AUTHORIZATION_ERROR` - Auth check failed
- `OCPP_PROTOCOL_ERROR` - OCPP message validation failed
- `WEBSOCKET_ERROR` - WebSocket connection issue
- `TIMEOUT_ERROR` - Operation timed out

---

## Common Issues & Debugging

### Issue #1: "No connection found for identifier"

**Symptom:** Server cannot send commands to charger (RemoteStop, SetChargingProfile, etc.)

**Diagnosis:**
```bash
# Check if charger is sending messages TO server
curl -X POST https://juicehub-hasura.onrender.com/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: {SECRET}" \
  -d '{
    "query": "query { OCPPMessages(where: {stationId: {_eq: \"WALLBOX-HOME-001\"}}, order_by: {createdAt: desc}, limit: 5) { action createdAt } }"
  }'

# If recent messages exist → Charger is connected
# If "No connection found" error persists → WebSocket session issue
```

**Root Cause:**
- WebSocket connection established for **inbound** messages only
- Session not registered in connection manager for **outbound** messages
- Likely in: `Core/Server/src/ocpp/` connection handling logic

**Workaround:** None currently - requires code fix

**Fix Location:** `Core/Server/src/ocpp/router/` or similar connection manager

---

### Issue #2: Charger Shows "Unavailable"

**Symptom:** Connector status stuck on "Unavailable"

**Diagnosis:**
```bash
# Check connector status
curl -X POST https://juicehub-hasura.onrender.com/v1/graphql \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: {SECRET}" \
  -d '{
    "query": "query { Connectors(where: {stationId: {_eq: \"WALLBOX-HOME-001\"}}) { connectorId status updatedAt } }"
  }'
```

**Cause:** `ChangeAvailability` command sent with `type: "Inoperative"`

**Fix:**
```bash
curl -X POST "https://juicehub-core.onrender.com/ocpp/1.6/configuration/changeAvailability?identifier=WALLBOX-HOME-001&tenantId=1" \
  -H "Content-Type: application/json" \
  -d '{"connectorId":1,"type":"Operative"}'
```

---

### Issue #3: Authorization Returns "Invalid" for Valid Token

**Symptom:** Guest can't charge despite having valid authorization

**Diagnosis Steps:**

1. **Check if token exists:**
```graphql
query CheckAuth($idToken: String!) {
  Authorizations(where: {idToken: {_eq: $idToken}}) {
    id
    idToken
    status
    cacheExpiryDateTime
    tenantId
  }
}
```

2. **Check OCPP message log:**
```graphql
query CheckAuthMessages($stationId: String!) {
  OCPPMessages(
    where: {
      stationId: {_eq: $stationId},
      action: {_eq: "Authorize"}
    },
    order_by: {createdAt: desc},
    limit: 3
  ) {
    message
    createdAt
  }
}
```

**Common Causes:**
- Token expired (`cacheExpiryDateTime < now()`)
- Wrong `tenantId` (multi-tenancy mismatch)
- Token status not "Accepted"
- ChargePoint in "dumb mode" (LocalAuthorizeOffline=true)

**Code Location:** `Core/03_Modules/EVDriver/src/module/module.ts:735` → `_handleOCPP16Authorize()`

---

### Issue #4: Live Stats Not Updating

**Symptom:** Transaction data (kWh, duration) not updating in real-time

**Expected Behavior:**
- Charger sends `MeterValues` every 5-60 seconds during charging
- Platform receives and stores in `OCPPMessages` table
- UI queries database for latest values

**Current Implementation Gap:**
- ✅ Messages received and stored
- ❌ No real-time update mechanism (no WebSocket to UI)
- ❌ UI requires manual refresh

**Solutions:**

**Option A: Polling (Simple)**
```typescript
// In React component
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await refetch(); // Apollo Client
    setStats(data.Transactions[0]);
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, [refetch]);
```

**Option B: GraphQL Subscriptions (Better)**
```typescript
// Enable Hasura subscriptions
subscription WatchTransaction($stationId: String!) {
  Transactions(
    where: {stationId: {_eq: $stationId}, isActive: {_eq: true}}
  ) {
    totalKwh
    timeSpentCharging
    updatedAt
  }
}
```

**Option C: Server-Sent Events (Best for your use case)**
- Core server publishes updates to SSE endpoint
- App subscribes and receives real-time updates
- No polling, lower overhead than WebSocket

---

## Extending the Platform

### Adding a New OCPP Message Handler

**Example: Adding support for `GetLocalListVersion`**

**Step 1: Define the types** (if not already in `00_Base`)

Check: `Core/00_Base/src/ocpp/model/1.6/types/`

**Step 2: Add handler to appropriate module**

```typescript
// In Core/03_Modules/EVDriver/src/module/module.ts

@AsHandler(OCPPVersion.OCPP1_6, OCPP1_6_CallAction.GetLocalListVersion)
protected async _handleGetLocalListVersion(
  message: IMessage<OCPP1_6.GetLocalListVersionRequest>,
  props?: HandlerProperties,
): Promise<void> {
  this._logger.debug('GetLocalListVersion received:', message, props);

  try {
    const tenantId = message.context.tenantId;
    const stationId = message.context.stationId;

    // Business logic here
    const version = await this._localAuthListRepository.getCurrentVersion(tenantId, stationId);

    const response: OCPP1_6.GetLocalListVersionResponse = {
      listVersion: version || 0
    };

    await this.sendCallResultWithMessage(message, response);
    this._logger.info('GetLocalListVersion response sent', { version, stationId });

  } catch (error) {
    this._logger.error('GetLocalListVersion failed', {
      error: error instanceof Error ? error.message : String(error),
      stationId: message.context.stationId
    });

    // Send error response
    await this.sendCallError(
      message,
      'InternalError',
      'Failed to retrieve local list version'
    );
  }
}
```

**Step 3: Register handler**

Handlers are auto-registered via `@AsHandler` decorator.

**Step 4: Add tests**

```typescript
// In Core/03_Modules/EVDriver/test/module.test.ts

describe('GetLocalListVersion', () => {
  it('should return current list version', async () => {
    const message = createMockMessage(OCPP1_6_CallAction.GetLocalListVersion, {});
    await module._handleGetLocalListVersion(message);

    expect(mockSendCallResult).toHaveBeenCalledWith(
      expect.objectContaining({ listVersion: expect.any(Number) })
    );
  });
});
```

---

### Adding a New Database Table

**Step 1: Create migration**

```bash
cd Core/01_Data
npx sequelize-cli migration:generate --name add-guest-sessions-table
```

**Step 2: Write migration** (`src/layers/sequelize/migrations/{timestamp}-add-guest-sessions-table.ts`)

```typescript
export const up: Rewriter = {
  columns: {
    id: { type: DataType.INTEGER, primaryKey: true, autoIncrement: true },
    tenantId: { type: DataType.INTEGER, allowNull: false },
    guestEmail: { type: DataType.STRING, allowNull: false },
    reservationId: { type: DataType.INTEGER, references: { model: 'Reservations', key: 'id' } },
    authToken: { type: DataType.STRING, unique: true },
    createdAt: { type: DataType.DATE, allowNull: false },
    expiresAt: { type: DataType.DATE, allowNull: false }
  }
};
```

**Step 3: Create Sequelize model** (`src/layers/sequelize/model/GuestSession.ts`)

```typescript
import { Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { BaseModelWithTenant } from './BaseModelWithTenant';
import { Reservation } from './Reservation';

@Table
export class GuestSession extends BaseModelWithTenant {
  @Column(DataType.STRING)
  declare guestEmail: string;

  @ForeignKey(() => Reservation)
  @Column(DataType.INTEGER)
  declare reservationId: number;

  @BelongsTo(() => Reservation)
  declare reservation: Reservation;

  @Column({ type: DataType.STRING, unique: true })
  declare authToken: string;

  @Column(DataType.DATE)
  declare expiresAt: Date;
}
```

**Step 4: Create repository** (`src/layers/sequelize/repository/GuestSession.ts`)

```typescript
export class SequelizeGuestSessionRepository implements IGuestSessionRepository {
  // Implement CRUD methods
}
```

**Step 5: Track in Hasura**

```bash
curl -X POST https://juicehub-hasura.onrender.com/v1/metadata \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: {SECRET}" \
  -d '{
    "type": "pg_track_table",
    "args": {
      "schema": "public",
      "name": "GuestSessions"
    }
  }'
```

---

## Environment Configuration

### Required Environment Variables

**Core Server** (`.env` in `Core/` or `Core/Server/`)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=citrine
DB_USER=citrine
DB_PASSWORD={SECURE_PASSWORD}

# RabbitMQ
AMQP_URL=amqp://guest:guest@localhost:5672

# Server Ports
SERVER_PORT=8080
SERVER_WEBSOCKET_PORT=8081

# Logging
LOG_LEVEL=debug

# Multi-tenancy
DEFAULT_TENANT_ID=1
```

**Hasura** (Environment variables in Render/Hasura Cloud)

```bash
HASURA_GRAPHQL_DATABASE_URL=postgres://user:pass@host:5432/dbname
HASURA_GRAPHQL_ADMIN_SECRET={SECURE_RANDOM_STRING}
HASURA_GRAPHQL_ENABLE_CONSOLE=true
HASURA_GRAPHQL_UNAUTHORIZED_ROLE=anonymous
```

**OperatorUI** (`.env` in `OperatorUI/`)

```bash
VITE_HASURA_URL=https://juicehub-hasura.onrender.com/v1/graphql
VITE_HASURA_WS_URL=wss://juicehub-hasura.onrender.com/v1/graphql
VITE_CORE_URL=https://juicehub-core.onrender.com
```

### Security Best Practices

**❌ NEVER commit these to git:**
- Database passwords
- API keys
- Admin secrets
- JWT secrets

**✅ DO:**
- Use `.env.example` with placeholder values
- Store production secrets in Render/cloud provider secret manager
- Rotate secrets regularly
- Use different secrets for dev/staging/prod

---

## Testing Guidelines

### Unit Tests

**Location:** `{module}/test/`

**Example: Testing Authorization Logic**

```typescript
import { EVDriverModule } from '../src/module/module';

describe('Authorization Handler', () => {
  let module: EVDriverModule;
  let mockRepository: jest.Mocked<IAuthorizationRepository>;

  beforeEach(() => {
    mockRepository = {
      readAllByQuerystring: jest.fn(),
    } as any;

    module = new EVDriverModule(config, cache, /* ... */, mockRepository);
  });

  it('should accept valid authorization', async () => {
    mockRepository.readAllByQuerystring.mockResolvedValue([
      { idToken: 'GUEST-001', status: 'Accepted', cacheExpiryDateTime: '2099-12-31T23:59:59Z' }
    ]);

    const message = createMockMessage({ idTag: 'GUEST-001' });
    await module._handleOCPP16Authorize(message);

    expect(mockSendCallResult).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idTagInfo: expect.objectContaining({ status: 'Accepted' })
      })
    );
  });

  it('should reject expired authorization', async () => {
    mockRepository.readAllByQuerystring.mockResolvedValue([
      { idToken: 'GUEST-002', status: 'Accepted', cacheExpiryDateTime: '2020-01-01T00:00:00Z' }
    ]);

    const message = createMockMessage({ idTag: 'GUEST-002' });
    await module._handleOCPP16Authorize(message);

    expect(mockSendCallResult).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idTagInfo: expect.objectContaining({ status: 'Expired' })
      })
    );
  });
});
```

### Integration Tests

**Test full flow from HTTP request → database → OCPP response**

```typescript
describe('Authorization Integration', () => {
  it('should create guest token and authorize successfully', async () => {
    // 1. Create authorization via GraphQL
    const token = await createAuthorization({
      idToken: 'INTEGRATION-TEST-001',
      expiryDate: '2099-12-31T23:59:59Z'
    });

    // 2. Simulate OCPP Authorize message
    const ocppMessage = [2, '12345', 'Authorize', { idTag: token.idToken }];
    const response = await sendOcppMessage(ocppMessage);

    // 3. Verify response
    expect(response[0]).toBe(3); // CALLRESULT
    expect(response[2].idTagInfo.status).toBe('Accepted');

    // 4. Cleanup
    await deleteAuthorization(token.id);
  });
});
```

### Running Tests

```bash
# Unit tests
cd Core/03_Modules/EVDriver
npm test

# Integration tests
cd Core
npm run test:integration

# E2E tests
cd OperatorUI
npm run test:e2e
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] No hard-coded credentials in code
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security headers configured
- [ ] CORS settings correct
- [ ] Rate limiting enabled
- [ ] Logging configured (structured JSON logs)
- [ ] Error tracking setup (Sentry/similar)
- [ ] Health check endpoint working

### Post-Deployment Verification

```bash
# Check Core server health
curl https://juicehub-core.onrender.com/health

# Check Hasura health
curl https://juicehub-hasura.onrender.com/healthz

# Check UI loads
curl -I https://juicehub-ui.onrender.com

# Test OCPP connection
# (Requires actual charger or simulator)
```

---

## Support & Resources

### Official Documentation
- **OCPP 1.6 Spec:** https://www.openchargealliance.org/protocols/ocpp-16/
- **OCPP 2.0.1 Spec:** https://www.openchargealliance.org/protocols/ocpp-201/
- **CitrineOS:** https://github.com/citrineos/citrineos-core
- **Hasura Docs:** https://hasura.io/docs/latest/graphql/core/index.html

### Troubleshooting
- Check logs: `docker logs {container-name}`
- Database console: `psql -h localhost -U citrine -d citrine`
- Message queue: http://localhost:15672 (RabbitMQ management)

### Getting Help
1. Check this guide first
2. Search existing GitHub issues
3. Check OCPP specification
4. Ask in team Slack/Discord

---

**End of Developer Guide** | Last updated: December 2025
