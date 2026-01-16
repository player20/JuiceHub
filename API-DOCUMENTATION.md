# JuiceHub API Documentation

**Version**: 1.8.0
**Last Updated**: January 7, 2026
**Base URL (Production)**: https://juicehub-hasura.onrender.com/v1/graphql
**OCPP WebSocket Base**: wss://juicehub-core.onrender.com

---

## Table of Contents

1. [Authentication](#authentication)
2. [GraphQL API](#graphql-api)
3. [OCPP WebSocket API](#ocpp-websocket-api)
4. [REST API](#rest-api)
5. [Database Schema](#database-schema)
6. [Environment Variables](#environment-variables)
7. [Rate Limits & Quotas](#rate-limits--quotas)
8. [Error Handling](#error-handling)

---

## Authentication

### Supported Methods

JuiceHub supports multiple authentication mechanisms:

#### 1. **Hasura Admin Secret** (Development/Admin)
```http
POST /v1/graphql
Headers:
  X-Hasura-Admin-Secret: devadmin123
  Content-Type: application/json
```

#### 2. **Keycloak OIDC** (Production)
```http
POST /v1/graphql
Headers:
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json
```

#### 3. **Generic Auth Provider**
For custom authentication implementations.

### Getting an Access Token (Keycloak)

```bash
curl -X POST https://your-keycloak-server/realms/citrineos/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=citrineos-client" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"
```

---

## GraphQL API

### Base Endpoint

```
POST https://juicehub-hasura.onrender.com/v1/graphql
```

### Headers

```http
Content-Type: application/json
X-Hasura-Admin-Secret: <admin_secret>
# OR
Authorization: Bearer <jwt_token>
```

---

## Analytics API

### Get Usage Snapshots

Get aggregated usage data for a date range.

**Query:**
```graphql
query GetUsageSnapshots($startDate: date!, $endDate: date!) {
  usage_snapshots(
    where: {
      snapshot_date: { _gte: $startDate, _lte: $endDate }
    }
    order_by: { snapshot_date: asc }
  ) {
    id
    snapshot_date
    total_sessions
    total_energy_kwh
    total_revenue
    unique_users
    total_duration_minutes
  }
}
```

**Variables:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-07"
}
```

**Response:**
```json
{
  "data": {
    "usage_snapshots": [
      {
        "id": 1,
        "snapshot_date": "2026-01-01",
        "total_sessions": 45,
        "total_energy_kwh": 567.8,
        "total_revenue": 123.45,
        "unique_users": 23,
        "total_duration_minutes": 3450
      }
    ]
  }
}
```

### Get Usage Aggregate

Get totals for a date range.

**Query:**
```graphql
query GetUsageAggregate($startDate: date!, $endDate: date!) {
  usage_snapshots_aggregate(
    where: {
      snapshot_date: { _gte: $startDate, _lte: $endDate }
    }
  ) {
    aggregate {
      sum {
        total_sessions
        total_energy_kwh
        total_revenue
        total_duration_minutes
      }
    }
  }
}
```

### Get Station Performance

Get daily performance metrics for charging stations.

**Query:**
```graphql
query GetStationPerformance($startDate: date!, $endDate: date!) {
  station_performance_daily(
    where: {
      date: { _gte: $startDate, _lte: $endDate }
    }
    order_by: { date: asc }
  ) {
    id
    charging_station_id
    date
    uptime_percentage
    health_score
    total_sessions
    successful_sessions
    failed_sessions
    total_energy_kwh
    total_revenue
    avg_session_duration_minutes
  }
}
```

### Get Low-Performing Stations

Identify stations with health scores below threshold.

**Query:**
```graphql
query GetLowPerformingStations($threshold: Int!, $date: date!) {
  station_performance_daily(
    where: {
      date: { _eq: $date }
      health_score: { _lt: $threshold }
    }
    order_by: { health_score: asc }
  ) {
    id
    charging_station_id
    health_score
    uptime_percentage
    total_sessions
    failed_sessions
    ChargingStation {
      id
      station_id
      registration_status
    }
  }
}
```

**Variables:**
```json
{
  "threshold": 70,
  "date": "2026-01-07"
}
```

### Get Network Summary

Get overall network statistics.

**Query:**
```graphql
query GetNetworkSummary {
  total_stations: ChargingStations_aggregate {
    aggregate {
      count
    }
  }

  active_stations: ChargingStations_aggregate(
    where: { registration_status: { _eq: "Accepted" } }
  ) {
    aggregate {
      count
    }
  }

  total_connectors: Connectors_aggregate {
    aggregate {
      count
    }
  }

  all_time_sessions: Transactions_aggregate {
    aggregate {
      count
      sum {
        total_cost
      }
    }
  }
}
```

---

## Revenue API

### Get Revenue Summary

Get revenue metrics for a date range.

**Query:**
```graphql
query GetRevenueSummary($startDate: date!, $endDate: date!) {
  revenue_daily_summary_aggregate(
    where: { date: { _gte: $startDate, _lte: $endDate } }
  ) {
    aggregate {
      sum {
        total_revenue
        total_invoiced
        total_paid
        total_pending
        total_overdue
      }
    }
  }
}
```

### Get Invoices

List invoices with filtering and pagination.

**Query:**
```graphql
query GetInvoices(
  $limit: Int!
  $offset: Int!
  $where: invoices_bool_exp
  $orderBy: [invoices_order_by!]
) {
  invoices(
    limit: $limit
    offset: $offset
    where: $where
    order_by: $orderBy
  ) {
    id
    invoice_number
    customer_name
    customer_email
    issue_date
    due_date
    status
    total_amount
    amount_paid
    currency
    created_at
  }
  invoices_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
```

**Variables:**
```json
{
  "limit": 20,
  "offset": 0,
  "where": {
    "status": { "_eq": "pending" }
  },
  "orderBy": [
    { "due_date": "asc" }
  ]
}
```

### Create Invoice

**Mutation:**
```graphql
mutation CreateInvoice($input: invoices_insert_input!) {
  insert_invoices_one(object: $input) {
    id
    invoice_number
    status
  }
}
```

**Variables:**
```json
{
  "input": {
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "issue_date": "2026-01-07",
    "due_date": "2026-02-07",
    "status": "pending",
    "subtotal": 100.00,
    "tax_rate": 0.10,
    "tax_amount": 10.00,
    "total_amount": 110.00,
    "currency": "USD"
  }
}
```

### Create Payment

**Mutation:**
```graphql
mutation CreatePayment($input: payments_insert_input!) {
  insert_payments_one(object: $input) {
    id
    amount
    status
  }
}
```

---

## Alerts API

### Get Active Alerts

**Query:**
```graphql
query GetActiveAlerts($limit: Int!, $offset: Int!, $where: alerts_bool_exp) {
  alerts(
    limit: $limit
    offset: $offset
    where: $where
    order_by: { triggered_at: desc }
  ) {
    id
    rule_id
    severity
    title
    message
    metric_name
    metric_value
    threshold_value
    triggered_at
    acknowledged_at
    resolved_at
    status
    charging_station_id
    ChargingStation {
      id
      station_id
      registration_status
    }
  }
  alerts_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
```

**Variables:**
```json
{
  "limit": 50,
  "offset": 0,
  "where": {
    "status": { "_eq": "active" }
  }
}
```

### Create Alert Rule

**Mutation:**
```graphql
mutation CreateAlertRule($input: alert_rules_insert_input!) {
  insert_alert_rules_one(object: $input) {
    id
    name
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "High Temperature Alert",
    "description": "Alert when connector temperature exceeds threshold",
    "rule_type": "threshold",
    "severity": "critical",
    "metric_name": "connector_temperature",
    "threshold_value": 80,
    "comparison_operator": "greater_than",
    "time_window_minutes": 5,
    "cooldown_minutes": 30,
    "is_enabled": true,
    "notify_email": true,
    "create_incident": true,
    "incident_severity": "high"
  }
}
```

### Acknowledge Alert

**Mutation:**
```graphql
mutation AcknowledgeAlert($id: uuid!, $acknowledgedBy: String!) {
  update_alerts_by_pk(
    pk_columns: { id: $id }
    _set: {
      status: "acknowledged"
      acknowledged_at: "now()"
      acknowledged_by: $acknowledgedBy
    }
  ) {
    id
    status
  }
}
```

### Resolve Alert

**Mutation:**
```graphql
mutation ResolveAlert($id: uuid!, $resolvedBy: String!) {
  update_alerts_by_pk(
    pk_columns: { id: $id }
    _set: {
      status: "resolved"
      resolved_at: "now()"
      resolved_by: $resolvedBy
    }
  ) {
    id
    status
  }
}
```

---

## System Settings API

### Get System Settings

**Query:**
```graphql
query GetSystemSettings {
  SystemSettings(limit: 1) {
    id
    google_maps_api_key
    google_maps_enabled
    organization_name
    support_email
    support_phone
    created_at
    updated_at
  }
}
```

### Update System Settings

**Mutation:**
```graphql
mutation UpdateSystemSettings(
  $id: Int!
  $google_maps_api_key: String
  $google_maps_enabled: Boolean
  $organization_name: String
  $support_email: String
  $support_phone: String
) {
  update_SystemSettings_by_pk(
    pk_columns: { id: $id }
    _set: {
      google_maps_api_key: $google_maps_api_key
      google_maps_enabled: $google_maps_enabled
      organization_name: $organization_name
      support_email: $support_email
      support_phone: $support_phone
    }
  ) {
    id
    google_maps_api_key
    google_maps_enabled
    organization_name
    support_email
    support_phone
    updated_at
  }
}
```

---

## OCPP WebSocket API

### WebSocket Endpoints

JuiceHub supports OCPP 1.6 and OCPP 2.0.1 protocols over WebSocket connections.

#### **OCPP 1.6 Endpoints**

```
# Without TLS (Security Profile 0)
ws://juicehub-core.onrender.com:8092/{chargingStationId}

# With Basic Auth (Security Profile 1)
ws://juicehub-core.onrender.com:8093/{chargingStationId}

# With Client Certificates (Security Profile 2)
wss://juicehub-core.onrender.com:8094/{chargingStationId}
```

#### **OCPP 2.0.1 Endpoints**

```
# Without TLS (Security Profile 0)
ws://juicehub-core.onrender.com:8081/{chargingStationId}

# With Basic Auth (Security Profile 1)
ws://juicehub-core.onrender.com:8082/{chargingStationId}

# With Client Certificates (Security Profile 2-3)
wss://juicehub-core.onrender.com:8083/{chargingStationId}
```

### Connection Parameters

```javascript
const wsUrl = `ws://juicehub-core.onrender.com:8092/${stationId}`;
const ws = new WebSocket(wsUrl, ['ocpp1.6']);

ws.onopen = () => {
  console.log('OCPP connection established');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle OCPP message
};
```

### OCPP Message Format

All OCPP messages follow the JSON-RPC 2.0 format:

```json
[
  <MessageTypeId>,
  "<UniqueId>",
  "<Action>",
  <Payload>
]
```

**Message Types:**
- `2` - CALL (request)
- `3` - CALLRESULT (response)
- `4` - CALLERROR (error)

### OCPP 1.6 Messages

#### **BootNotification**

**Request:**
```json
[
  2,
  "19223201",
  "BootNotification",
  {
    "chargePointVendor": "Wallbox",
    "chargePointModel": "Pulsar Plus",
    "chargePointSerialNumber": "WB-123456",
    "chargeBoxSerialNumber": "WB-123456",
    "firmwareVersion": "5.6.4",
    "iccid": "",
    "imsi": "",
    "meterType": "EnergyMeter",
    "meterSerialNumber": "EM-123456"
  }
]
```

**Response:**
```json
[
  3,
  "19223201",
  {
    "currentTime": "2026-01-07T10:30:00.000Z",
    "interval": 300,
    "status": "Accepted"
  }
]
```

#### **StatusNotification**

**Request:**
```json
[
  2,
  "19223202",
  "StatusNotification",
  {
    "connectorId": 1,
    "errorCode": "NoError",
    "status": "Available"
  }
]
```

#### **StartTransaction**

**Request:**
```json
[
  2,
  "19223203",
  "StartTransaction",
  {
    "connectorId": 1,
    "idTag": "USER001",
    "meterStart": 0,
    "timestamp": "2026-01-07T10:35:00.000Z"
  }
]
```

**Response:**
```json
[
  3,
  "19223203",
  {
    "idTagInfo": {
      "status": "Accepted"
    },
    "transactionId": 12345
  }
]
```

#### **MeterValues**

**Request:**
```json
[
  2,
  "19223204",
  "MeterValues",
  {
    "connectorId": 1,
    "transactionId": 12345,
    "meterValue": [
      {
        "timestamp": "2026-01-07T10:40:00.000Z",
        "sampledValue": [
          {
            "value": "5.6",
            "context": "Sample.Periodic",
            "measurand": "Energy.Active.Import.Register",
            "unit": "kWh"
          },
          {
            "value": "7200",
            "context": "Sample.Periodic",
            "measurand": "Power.Active.Import",
            "unit": "W"
          }
        ]
      }
    ]
  }
]
```

#### **StopTransaction**

**Request:**
```json
[
  2,
  "19223205",
  "StopTransaction",
  {
    "idTag": "USER001",
    "meterStop": 25680,
    "timestamp": "2026-01-07T11:00:00.000Z",
    "transactionId": 12345,
    "reason": "Local"
  }
]
```

**Response:**
```json
[
  3,
  "19223205",
  {
    "idTagInfo": {
      "status": "Accepted"
    }
  }
]
```

#### **Heartbeat**

**Request:**
```json
[
  2,
  "19223206",
  "Heartbeat",
  {}
]
```

**Response:**
```json
[
  3,
  "19223206",
  {
    "currentTime": "2026-01-07T10:45:00.000Z"
  }
]
```

### OCPP 2.0.1 Messages

#### **BootNotificationRequest**

```json
[
  2,
  "19223201",
  "BootNotification",
  {
    "chargingStation": {
      "model": "Pulsar Plus",
      "vendorName": "Wallbox",
      "serialNumber": "WB-123456"
    },
    "reason": "PowerUp"
  }
]
```

#### **TransactionEventRequest**

```json
[
  2,
  "19223207",
  "TransactionEvent",
  {
    "eventType": "Started",
    "timestamp": "2026-01-07T10:35:00.000Z",
    "triggerReason": "Authorized",
    "seqNo": 0,
    "transactionInfo": {
      "transactionId": "TXN-12345"
    },
    "meterValue": [
      {
        "timestamp": "2026-01-07T10:35:00.000Z",
        "sampledValue": [
          {
            "value": 0.0,
            "context": "Transaction.Begin",
            "measurand": "Energy.Active.Import.Register",
            "unitOfMeasure": {
              "unit": "kWh"
            }
          }
        ]
      }
    ]
  }
]
```

### Server-Initiated Commands (OCPP 1.6)

The server can send commands to charging stations:

#### **RemoteStartTransaction**

```json
[
  2,
  "server-cmd-001",
  "RemoteStartTransaction",
  {
    "connectorId": 1,
    "idTag": "USER001"
  }
]
```

#### **RemoteStopTransaction**

```json
[
  2,
  "server-cmd-002",
  "RemoteStopTransaction",
  {
    "transactionId": 12345
  }
]
```

#### **Reset**

```json
[
  2,
  "server-cmd-003",
  "Reset",
  {
    "type": "Soft"
  }
]
```

#### **ChangeConfiguration**

```json
[
  2,
  "server-cmd-004",
  "ChangeConfiguration",
  {
    "key": "HeartbeatInterval",
    "value": "300"
  }
]
```

### WebSocket Configuration

**Ping Interval**: 300 seconds (5 minutes)
**Connection Timeout**: 30 seconds
**Message Timeout**: 30 seconds
**Supported Protocols**: `ocpp1.6`, `ocpp2.0.1`

---

## REST API

### OCPP Module Endpoints

The following endpoints are exposed by the OCPP modules through the internal FastifyInstance.

**Note**: These are internal endpoints primarily used for system-to-system communication and administrative operations.

#### Base URL
```
http://localhost:8080/ocpp
```

### Common Endpoints Pattern

All modules follow a consistent RESTful pattern:

```
GET    /api/v1/{module}/{resource}           - List resources
GET    /api/v1/{module}/{resource}/{id}      - Get resource by ID
POST   /api/v1/{module}/{resource}           - Create resource
PUT    /api/v1/{module}/{resource}/{id}      - Update resource
DELETE /api/v1/{module}/{resource}/{id}      - Delete resource
```

---

## Database Schema

### Core Tables

#### **ChargingStations**

```sql
CREATE TABLE "ChargingStations" (
  id SERIAL PRIMARY KEY,
  station_id VARCHAR(255) NOT NULL UNIQUE,
  registration_status VARCHAR(50),
  boot_notification JSONB,
  last_boot_notification_time TIMESTAMP WITH TIME ZONE,
  last_heartbeat_time TIMESTAMP WITH TIME ZONE,
  ocpp_protocol VARCHAR(10),
  security_profile INTEGER,
  location_id INTEGER REFERENCES "Locations"(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Connectors**

```sql
CREATE TABLE "Connectors" (
  id SERIAL PRIMARY KEY,
  connector_id INTEGER NOT NULL,
  charging_station_id INTEGER REFERENCES "ChargingStations"(id),
  status VARCHAR(50),
  error_code VARCHAR(50),
  info VARCHAR(255),
  vendor_id VARCHAR(255),
  vendor_error_code VARCHAR(255),
  max_power INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Transactions**

```sql
CREATE TABLE "Transactions" (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE,
  charging_station_id INTEGER REFERENCES "ChargingStations"(id),
  connector_id INTEGER,
  id_token VARCHAR(255),
  time_start TIMESTAMP WITH TIME ZONE,
  time_end TIMESTAMP WITH TIME ZONE,
  meter_start INTEGER,
  meter_stop INTEGER,
  reason VARCHAR(50),
  total_cost DECIMAL(10, 2),
  total_energy DECIMAL(10, 2),
  total_duration INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **MeterValues**

```sql
CREATE TABLE "MeterValues" (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES "Transactions"(id),
  connector_id INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE,
  sampled_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Locations**

```sql
CREATE TABLE "Locations" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  address VARCHAR(500),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Authorizations**

```sql
CREATE TABLE "Authorizations" (
  id SERIAL PRIMARY KEY,
  id_token VARCHAR(255) NOT NULL UNIQUE,
  id_token_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Accepted',
  expiry_date TIMESTAMP WITH TIME ZONE,
  parent_id_token VARCHAR(255),
  concurrent_transactions INTEGER,
  real_time_auth BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Analytics Tables

#### **usage_snapshots**

```sql
CREATE TABLE usage_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  total_sessions INTEGER,
  total_energy_kwh DECIMAL(10, 2),
  total_revenue DECIMAL(10, 2),
  unique_users INTEGER,
  total_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **station_performance_daily**

```sql
CREATE TABLE station_performance_daily (
  id SERIAL PRIMARY KEY,
  charging_station_id INTEGER REFERENCES "ChargingStations"(id),
  date DATE NOT NULL,
  uptime_percentage DECIMAL(5, 2),
  health_score INTEGER,
  total_sessions INTEGER,
  successful_sessions INTEGER,
  failed_sessions INTEGER,
  total_energy_kwh DECIMAL(10, 2),
  total_revenue DECIMAL(10, 2),
  avg_session_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(charging_station_id, date)
);
```

### Revenue Tables

#### **invoices**

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  billing_address TEXT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  subtotal DECIMAL(10, 2),
  tax_rate DECIMAL(5, 4),
  tax_amount DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  pdf_path VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **payments**

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'completed',
  transaction_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Alerts Tables

#### **alert_rules**

```sql
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  metric_name VARCHAR(100),
  threshold_value DECIMAL(10, 2),
  comparison_operator VARCHAR(20),
  time_window_minutes INTEGER,
  cooldown_minutes INTEGER DEFAULT 30,
  is_enabled BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,
  notify_webhook BOOLEAN DEFAULT false,
  create_incident BOOLEAN DEFAULT false,
  incident_severity VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **alerts**

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id),
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  metric_name VARCHAR(100),
  metric_value DECIMAL(10, 2),
  threshold_value DECIMAL(10, 2),
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by VARCHAR(255),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  charging_station_id INTEGER REFERENCES "ChargingStations"(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **incidents**

```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  charging_station_id INTEGER REFERENCES "ChargingStations"(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by VARCHAR(255),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by VARCHAR(255),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  resolution_notes TEXT,
  metadata JSONB
);
```

### System Tables

#### **SystemSettings**

```sql
CREATE TABLE "SystemSettings" (
  id SERIAL PRIMARY KEY,
  google_maps_api_key VARCHAR(255),
  google_maps_enabled BOOLEAN DEFAULT false,
  organization_name VARCHAR(255),
  support_email VARCHAR(255),
  support_phone VARCHAR(50),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### **ErrorLogs**

```sql
CREATE TABLE "ErrorLogs" (
  id SERIAL PRIMARY KEY,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('ocpp', 'database', 'api', 'frontend', 'authentication', 'system', 'other')),
  error_code VARCHAR(50),
  message TEXT NOT NULL,
  error_details JSONB,
  component VARCHAR(100),
  station_id VARCHAR(255),
  transaction_id VARCHAR(50),
  user_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(100),
  resolution_notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## Environment Variables

### Core Server

```bash
# Application Environment
APP_ENV=docker                    # local | docker | directus
NODE_ENV=production               # development | production

# Database Configuration
DB_HOST=aws-1-us-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xxxxx
DB_PASSWORD=your-password
DB_SYNC_MODE=migrate             # sync | migrate | none
DB_POOL_MAX=20
DB_POOL_MIN=2

# Hasura GraphQL Engine
HASURA_URL=https://juicehub-hasura.onrender.com
HASURA_ADMIN_SECRET=devadmin123

# Redis (Optional - for caching)
REDIS_URL=redis://localhost:6379

# RabbitMQ (Message Queue)
AMQP_URL=amqp://guest:guest@rabbitmq:5672

# OCPP Configuration
OCPP_1_6_PORT=8092
OCPP_2_0_1_PORT=8081
ALLOW_UNKNOWN_CHARGERS=true

# Security
JWT_SECRET=your-jwt-secret-here
ENABLE_CORS=true

# Logging
LOG_LEVEL=info                   # debug | info | warn | error
LOG_FORMAT=json                  # json | pretty

# Multi-tenancy (Optional)
DEFAULT_TENANT_ID=1
ENABLE_MULTI_TENANCY=false

# Keycloak (Optional)
KEYCLOAK_URL=https://your-keycloak-server
KEYCLOAK_REALM=citrineos
KEYCLOAK_CLIENT_ID=citrineos-client
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

### Frontend (OperatorUI)

```bash
# API Configuration
VITE_HASURA_URL=https://juicehub-hasura.onrender.com/v1/graphql
VITE_HASURA_WS_URL=wss://juicehub-hasura.onrender.com/v1/graphql
VITE_API_URL=https://juicehub-core.onrender.com

# Authentication
VITE_AUTH_PROVIDER=hasura        # hasura | keycloak | generic
VITE_HASURA_ADMIN_SECRET=devadmin123

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY

# Telemetry (Optional)
VITE_ENABLE_TELEMETRY=false
VITE_TELEMETRY_URL=https://telemetry.citrineos.com

# Feature Flags
VITE_ENABLE_REVENUE=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ALERTS=true
```

---

## Rate Limits & Quotas

### GraphQL API

- **Rate Limit**: 1000 requests per minute per IP
- **Query Depth**: Maximum 10 levels
- **Query Complexity**: Maximum 1000 nodes
- **Batch Limit**: Maximum 10 operations per batch request

### WebSocket Connections

- **Max Connections**: 1000 concurrent connections per server
- **Message Rate**: 100 messages per second per connection
- **Ping Interval**: 300 seconds (5 minutes)
- **Connection Timeout**: 30 seconds

### Best Practices

1. **Use GraphQL Subscriptions** for real-time data instead of polling
2. **Implement pagination** for large datasets (use `limit` and `offset`)
3. **Cache responses** when appropriate (use ETags)
4. **Use batch queries** to reduce round trips
5. **Implement exponential backoff** for retries

---

## Error Handling

### GraphQL Errors

**Error Response Format:**
```json
{
  "errors": [
    {
      "message": "Field 'invalidField' doesn't exist on type 'Transactions'",
      "extensions": {
        "path": "$.selectionSet.invalidField",
        "code": "validation-failed"
      }
    }
  ]
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `validation-failed` | Invalid GraphQL query | 400 |
| `permission-denied` | Unauthorized access | 403 |
| `not-found` | Resource not found | 404 |
| `constraint-violation` | Database constraint violated | 400 |
| `internal-error` | Server error | 500 |

### OCPP Errors

**CALLERROR Format:**
```json
[
  4,
  "<UniqueId>",
  "<ErrorCode>",
  "<ErrorDescription>",
  <ErrorDetails>
]
```

**OCPP 1.6 Error Codes:**
- `NotImplemented` - Feature not supported
- `NotSupported` - Request not supported
- `InternalError` - Internal server error
- `ProtocolError` - Protocol violation
- `SecurityError` - Security check failed
- `FormationViolation` - Message format invalid
- `PropertyConstraintViolation` - Value constraint violated
- `OccurrenceConstraintViolation` - Occurrence constraint violated
- `TypeConstraintViolation` - Type constraint violated
- `GenericError` - Generic error

**Example:**
```json
[
  4,
  "19223201",
  "NotImplemented",
  "RemoteStartTransaction is not implemented",
  {}
]
```

### HTTP Error Responses

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Authentication token is invalid or expired",
    "details": {
      "token_expired_at": "2026-01-07T09:30:00Z"
    }
  }
}
```

---

## Webhooks

JuiceHub can send webhooks for various events to configured endpoints.

### Configuration

Webhooks are configured per alert rule or can be set globally in system settings.

### Event Types

- `transaction.started` - New charging session started
- `transaction.stopped` - Charging session ended
- `station.online` - Charging station came online
- `station.offline` - Charging station went offline
- `alert.triggered` - Alert rule triggered
- `alert.resolved` - Alert resolved
- `incident.created` - New incident created

### Webhook Payload

```json
{
  "event_type": "transaction.started",
  "event_id": "evt_123456",
  "timestamp": "2026-01-07T10:35:00.000Z",
  "data": {
    "transaction_id": 12345,
    "charging_station_id": "WB-001",
    "connector_id": 1,
    "id_token": "USER001",
    "meter_start": 0,
    "time_start": "2026-01-07T10:35:00.000Z"
  }
}
```

### Security

All webhooks include a signature in the `X-Webhook-Signature` header for verification:

```
X-Webhook-Signature: sha256=<HMAC_SHA256(payload, webhook_secret)>
```

---

## SDK & Client Libraries

### JavaScript/TypeScript

```bash
npm install @citrineos/client
```

```typescript
import { CitrineClient } from '@citrineos/client';

const client = new CitrineClient({
  hasuraUrl: 'https://juicehub-hasura.onrender.com/v1/graphql',
  adminSecret: 'your-admin-secret',
});

// Get charging stations
const stations = await client.getChargingStations({
  where: { registration_status: { _eq: 'Accepted' } }
});
```

### Python

```bash
pip install citrineos-client
```

```python
from citrineos import CitrineClient

client = CitrineClient(
    hasura_url='https://juicehub-hasura.onrender.com/v1/graphql',
    admin_secret='your-admin-secret'
)

# Get transactions
transactions = client.get_transactions(limit=100)
```

---

## Support

### Documentation
- **Main Docs**: https://citrineos.github.io
- **GitHub**: https://github.com/citrineos/citrineos-core

### Community
- **Discord**: https://discord.gg/citrineos
- **GitHub Discussions**: https://github.com/citrineos/citrineos-core/discussions

### Commercial Support
- **Email**: support@juicehub.com
- **Phone**: (555) 123-4567
- **SLA**: 24/7 for enterprise customers

---

## Changelog

### v1.8.0 (2026-01-07)
- Added SystemSettings API for centralized configuration
- Added ErrorLogs table and API
- Added Transaction Reconciliation Service
- Fixed GraphQL variables in Analytics, Alerts, and Revenue modules
- Increased OCPP ping interval to 300 seconds for better charger stability
- Improved frontend provider architecture

### v1.7.0 (2025-12-01)
- Added Alerts & Incidents management
- Added Revenue & Invoicing module
- Enhanced Analytics dashboard
- OCPP 2.0.1 support improvements

---

**Last Updated**: January 7, 2026
**Document Version**: 1.0.0
