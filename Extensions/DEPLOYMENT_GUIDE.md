# JuiceNet Protocol Extensions - Deployment Guide

## Overview

This guide covers deploying the comprehensive OCPP 2.0.1 / OCPI 2.2.1 data capture system with Guest/Host views, real-time metrics, and advanced error reporting.

---

## Architecture Summary

### What's Been Built

#### 1. Database Extensions
**Location**: `database/001_ocpi_extensions.sql`

**New Tables**:
- `OcpiSessions` - OCPI 2.2.1 session tracking
- `OcpiCDRs` - Charge Detail Records for billing
- `SessionMetrics` - Derived metrics (CO₂, miles, revenue, efficiency)
- `LiveSessionState` - Real-time state for active sessions
- `OcppErrorLog` - Enhanced error tracking with OCPP codes
- `OfflineMessageQueue` - Offline charger message handling

**Views**:
- `ActiveSessionsView` - Real-time active sessions with all metrics
- `SessionSummaryView` - Post-session summaries with financials

**Status**: ✅ Applied to database and tracked in Hasura GraphQL

#### 2. Calculations Service
**Location**: `services/calculations-service.ts`

**Features**:
- CO₂ savings calculation (grid-aware with external API integration ready)
- Miles added estimation (vehicle-specific efficiency)
- Revenue and cost tracking
- Efficiency and performance metrics
- Battery state-of-charge estimation
- Real-time and post-session processing

**Integration Points**:
- Processes `TransactionEvent` (Ended) for completed sessions
- Updates `MeterValues` messages for live data
- Stores results in `SessionMetrics` and `LiveSessionState` tables

---

## Integration with CitrineOS

### Step 1: Install Dependencies

```bash
cd ~/citrine/citrineos-core/Server

# Install PostgreSQL client for calculations service
npm install pg @types/pg

# (Optional) Install carbon intensity API client
npm install @watttime/node-client
```

### Step 2: Add Calculations Service to CitrineOS

**Option A: As a Module (Recommended)**

Copy the calculations service:
```bash
cp ~/citrine/juicenet-extensions/services/calculations-service.ts \
   ~/citrine/citrineos-core/Server/src/services/
```

Create integration handler:
```bash
cat > ~/citrine/citrineos-core/Server/src/services/calculations-handler.ts << 'TYPESCRIPT'
// Integration handler for calculations service
import CalculationsService from './calculations-service';
import { Logger } from 'winston';

const calcService = new CalculationsService({
  databaseUrl: process.env.DATABASE_URL || 
               `postgresql://${process.env.BOOTSTRAP_CITRINEOS_DATABASE_USERNAME}:${process.env.BOOTSTRAP_CITRINEOS_DATABASE_PASSWORD}@${process.env.BOOTSTRAP_CITRINEOS_DATABASE_HOST}:${process.env.BOOTSTRAP_CITRINEOS_DATABASE_PORT}/${process.env.BOOTSTRAP_CITRINEOS_DATABASE_NAME}`,
  defaultCostPerKwh: parseFloat(process.env.DEFAULT_COST_PER_KWH || '0.15'),
  defaultVehicleEfficiency: parseFloat(process.env.DEFAULT_VEHICLE_EFFICIENCY || '3.5'),
});

export async function handleTransactionEnded(transactionId: number, logger: Logger): Promise<void> {
  try {
    await calcService.processCompletedSession(transactionId);
    logger.info(`Calculated metrics for transaction ${transactionId}`);
  } catch (error) {
    logger.error(`Failed to calculate metrics for transaction ${transactionId}`, error);
  }
}

export async function handleMeterValues(transactionId: number, meterValue: any, logger: Logger): Promise<void> {
  try {
    await calcService.updateLiveSessionState(transactionId, meterValue);
  } catch (error) {
    logger.error(`Failed to update live session state for transaction ${transactionId}`, error);
  }
}
TYPESCRIPT
```

**Option B: As Standalone Service**

Run as separate Node.js service:
```bash
cd ~/citrine/juicenet-extensions/services

# Create package.json
cat > package.json << 'JSON'
{
  "name": "juicenet-calculations-service",
  "version": "1.0.0",
  "scripts": {
    "start": "ts-node calculations-service-worker.ts"
  },
  "dependencies": {
    "pg": "^8.11.0",
    "@types/pg": "^8.10.0",
    "amqplib": "^0.10.0"
  }
}
JSON

# Create worker that listens to RabbitMQ
cat > calculations-service-worker.ts << 'TYPESCRIPT'
import CalculationsService from './calculations-service';
import amqp from 'amqplib';

const calcService = new CalculationsService();

async function startWorker() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');
  const channel = await connection.createChannel();
  
  await channel.assertQueue('transaction.ended');
  await channel.assertQueue('meter.values');
  
  // Process completed transactions
  channel.consume('transaction.ended', async (msg) => {
    if (msg) {
      const { transactionId } = JSON.parse(msg.content.toString());
      await calcService.processCompletedSession(transactionId);
      channel.ack(msg);
    }
  });
  
  // Process live meter values
  channel.consume('meter.values', async (msg) => {
    if (msg) {
      const { transactionId, meterValue } = JSON.parse(msg.content.toString());
      await calcService.updateLiveSessionState(transactionId, meterValue);
      channel.ack(msg);
    }
  });
  
  console.log('✅ Calculations service worker started');
}

startWorker().catch(console.error);
TYPESCRIPT

# Install and run
npm install
npm start &
```

### Step 3: Hook into OCPP Message Handlers

Edit CitrineOS OCPP handlers to trigger calculations:

**For TransactionEvent (Ended)**:
```typescript
// In citrineos-core/Server/src/handlers/ocpp/TransactionEventHandler.ts
import { handleTransactionEnded } from '../services/calculations-handler';

// After saving transaction
if (eventType === 'Ended') {
  // Trigger calculations asynchronously
  handleTransactionEnded(transactionDatabaseId, logger).catch(err =>
    logger.error('Calculations failed', err)
  );
}
```

**For MeterValues**:
```typescript
// In citrineos-core/Server/src/handlers/ocpp/MeterValuesHandler.ts
import { handleMeterValues } from '../services/calculations-handler';

// After saving meter values
if (transactionId) {
  handleMeterValues(transactionDatabaseId, meterValue, logger).catch(err =>
    logger.error('Live state update failed', err)
  );
}
```

---

## Building Guest/Host UI Views

### GraphQL Queries for Views

**Active Session (Guest View)**:
```graphql
subscription GuestActiveSession($transactionId: Int!) {
  ActiveSessionsView(where: {transaction_id: {_eq: $transactionId}}) {
    transaction_id
    transactionId
    startTime
    location_name
    address
    city
    isCharging
    currentPowerKw
    currentKwhSession
    estimatedTimeRemainingMinutes
    currentBatteryPercent
    currentMilesAdded
    currentCo2SavedKg
    currentCostAccrued
    averageChargingSpeedKw
  }
}
```

**Session Summary (Post-Session)**:
```graphql
query GuestSessionSummary($transactionId: Int!) {
  SessionSummaryView(where: {transaction_id: {_eq: $transactionId}}) {
    transactionId
    startTime
    endTime
    duration_minutes
    totalKwh
    totalCost
    full_address
    co2SavedKg
    estimatedMilesAdded
    averageChargingSpeedKw
    efficiencyPercent
  }
}
```

**Host Active Sessions**:
```graphql
subscription HostActiveSessions($locationId: Int!) {
  ActiveSessionsView(where: {location_id: {_eq: $locationId}}) {
    transaction_id
    station_id
    chargePointVendor
    chargePointModel
    isCharging
    currentPowerKw
    currentKwhSession
    currentCostAccrued
    startTime
    estimatedTimeRemainingMinutes
  }
}
```

### React Component Examples

Create in `~/citrine/citrineos-operator-ui/src/pages/sessions/`:

**GuestView.tsx** (Real-Time Charging View):
```typescript
import React from 'react';
import { useSubscription } from '@refinedev/core';
import { Card, Progress, Statistic, Row, Col } from 'antd';
import { BoltOutlined, LeafOutlined, CarOutlined } from '@ant-design/icons';

export const GuestView: React.FC<{ transactionId: number }> = ({ transactionId }) => {
  const { data } = useSubscription({
    channel: 'graphql',
    resource: 'ActiveSessionsView',
    types: ['created', 'updated'],
    params: {
      subscription: `
        subscription {
          ActiveSessionsView(where: {transaction_id: {_eq: ${transactionId}}}) {
            isCharging
            currentKwhSession
            currentChargingSpeedKw
            currentMilesAdded
            currentCo2SavedKg
            currentCostAccrued
            currentBatteryPercent
            estimatedTimeRemainingMinutes
            location_name
            address
          }
        }
      `,
    },
  });

  const session = data?.data?.ActiveSessionsView[0];

  return (
    <div style={{ padding: '24px' }}>
      <h1>Your Charging Session</h1>
      
      {/* Connection Status */}
      <Card title="Connection Details">
        <p><strong>Location:</strong> {session?.location_name}</p>
        <p><strong>Address:</strong> {session?.address}</p>
        <p><strong>Charging:</strong> {session?.isCharging ? '✅ Active' : '⏸️ Paused'}</p>
      </Card>

      {/* Real-Time Stats */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Energy Delivered"
              value={session?.currentKwhSession || 0}
              suffix="kWh"
              prefix={<BoltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Charging Speed"
              value={session?.currentChargingSpeedKw || 0}
              suffix="kW"
              precision={1}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Miles Added"
              value={session?.currentMilesAdded || 0}
              suffix="mi"
              prefix={<CarOutlined />}
              precision={1}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="CO₂ Saved"
              value={session?.currentCo2SavedKg || 0}
              suffix="kg"
              prefix={<LeafOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* Battery Progress */}
      {session?.currentBatteryPercent && (
        <Card title="Battery Status" style={{ marginTop: 16 }}>
          <Progress 
            percent={session.currentBatteryPercent} 
            status="active"
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
          />
          <p>Estimated time remaining: {session.estimatedTimeRemainingMinutes || '—'} minutes</p>
        </Card>
      )}

      {/* Cost */}
      <Card title="Session Cost" style={{ marginTop: 16 }}>
        <Statistic
          title="Current Cost"
          value={session?.currentCostAccrued || 0}
          prefix="$"
          precision={2}
        />
      </Card>
    </div>
  );
};
```

**HostView.tsx** (Host Dashboard):
```typescript
import React from 'react';
import { useSubscription } from '@refinedev/core';
import { Table, Card, Tag } from 'antd';

export const HostView: React.FC<{ locationId: number }> = ({ locationId }) => {
  const { data } = useSubscription({
    channel: 'graphql',
    resource: 'ActiveSessionsView',
    types: ['created', 'updated', 'deleted'],
    params: {
      subscription: `
        subscription {
          ActiveSessionsView(where: {location_id: {_eq: ${locationId}}}) {
            transaction_id
            station_id
            chargePointVendor
            chargePointModel
            isCharging
            currentPowerKw
            currentKwhSession
            currentCostAccrued
            startTime
          }
        }
      `,
    },
  });

  const columns = [
    { title: 'Charger', dataIndex: 'station_id', key: 'station' },
    { title: 'Model', dataIndex: 'chargePointModel', key: 'model' },
    { 
      title: 'Status', 
      dataIndex: 'isCharging', 
      key: 'status',
      render: (charging: boolean) => (
        <Tag color={charging ? 'green' : 'orange'}>
          {charging ? 'Charging' : 'Idle'}
        </Tag>
      )
    },
    { title: 'Power (kW)', dataIndex: 'currentPowerKw', key: 'power' },
    { title: 'Energy (kWh)', dataIndex: 'currentKwhSession', key: 'energy' },
    { title: 'Revenue ($)', dataIndex: 'currentCostAccrued', key: 'revenue' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>Host Dashboard</h1>
      <Card title="Active Sessions">
        <Table 
          dataSource={data?.data?.ActiveSessionsView || []}
          columns={columns}
          rowKey="transaction_id"
        />
      </Card>
    </div>
  );
};
```

Add routes in `citrineos-operator-ui/src/App.tsx`:
```typescript
<Route path="/session/:id/guest" element={<GuestView />} />
<Route path="/location/:id/host" element={<HostView />} />
```

---

## Error Logging Dashboard

### GraphQL Query
```graphql
query ErrorLog($limit: Int = 100) {
  OcppErrorLog(
    order_by: {occuredAt: desc}
    limit: $limit
  ) {
    id
    stationId
    errorCode
    errorDescription
    severity
    errorCategory
    resolved
    occuredAt
    resolutionNotes
  }
}
```

### UI Component
```typescript
// citrineos-operator-ui/src/pages/errors/ErrorLog.tsx
export const ErrorLog: React.FC = () => {
  const { tableProps } = useTable({
    resource: 'OcppErrorLog',
    sorters: { initial: [{ field: 'occuredAt', order: 'desc' }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="stationId" title="Station" />
        <Table.Column dataIndex="errorCode" title="Error Code" />
        <Table.Column dataIndex="severity" title="Severity" 
          render={(severity) => <Tag color={severity === 'CRITICAL' ? 'red' : 'orange'}>{severity}</Tag>}
        />
        <Table.Column dataIndex="occuredAt" title="Occurred" />
        <Table.Column dataIndex="resolved" title="Resolved" 
          render={(resolved) => resolved ? '✅' : '⏳'}
        />
      </Table>
    </List>
  );
};
```

---

## Testing

### Manual Testing with Simulator

```bash
# Use EVerest simulator or OCPP 2.0.1 test tool
# Connect to: ws://localhost:8082/{stationId}

# Simulate charging session:
# 1. BootNotification
# 2. StatusNotification (Available)
# 3. TransactionEvent (Started)
# 4. MeterValues (periodic, e.g., every 10s)
# 5. TransactionEvent (Ended)

# Check database for metrics:
docker exec citrineos-postgres psql -U citrine -d citrine -c "
  SELECT * FROM \"SessionMetrics\" ORDER BY id DESC LIMIT 1;
"

# Check live state:
docker exec citrineos-postgres psql -U citrine -d citrine -c "
  SELECT * FROM \"LiveSessionState\" WHERE \"isCharging\" = TRUE;
"
```

### Automated Tests
```bash
cd ~/citrine/citrineos-core
npm test -- --grep "calculations"
```

---

## Production Deployment

### Environment Variables
```bash
# Add to .env
DEFAULT_COST_PER_KWH=0.15
DEFAULT_VEHICLE_EFFICIENCY=3.5
WATTTIME_API_KEY=your_api_key_here
GRID_CARBON_API_URL=https://api2.watttime.org/v2/
```

### Kubernetes Deployment
```yaml
# k8s-deployment/calculations-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calculations-service
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: calculations-service
        image: juicenet/calculations-service:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: url
        - name: DEFAULT_COST_PER_KWH
          value: "0.15"
```

### Monitoring
- Prometheus metrics for calculation latency
- Grafana dashboard for session metrics trends
- Alert on high error rates in OcppErrorLog

---

## Next Steps

1. ✅ Database extensions applied
2. ✅ Calculations service created
3. ⏳ Integrate service into CitrineOS handlers
4. ⏳ Build Guest/Host UI components
5. ⏳ Set up real-time subscriptions
6. ⏳ Deploy to production
7. ⏳ Test with real chargers

---

## Support & Documentation

- CitrineOS Docs: https://citrineos.github.io
- OCPP 2.0.1 Spec: https://openchargealliance.org
- OCPI 2.2.1 Spec: https://evroaming.org/app/uploads/2023/03/OCPI-2.2.1.pdf
- JuiceNet Extensions: See individual component READMEs

