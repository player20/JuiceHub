# JuiceNet App API Guide

**Ready-to-use GraphQL queries and mutations for the JuiceNet mobile app**

All these work RIGHT NOW with the existing JuiceHub/Hasura setup.

---

## API Endpoint

**GraphQL Endpoint:** `https://juicehub-hasura.onrender.com/v1/graphql`
**WebSocket (Subscriptions):** `wss://juicehub-hasura.onrender.com/v1/graphql`

**Authentication:**
For testing: `x-hasura-admin-secret: {your-secret}`
For production: Use JWT tokens (configured in Hasura)

---

## 1. Authorization Management

### Create Guest Authorization (When User Books)

```graphql
mutation CreateGuestAuthorization($idToken: String!, $expiresAt: timestamptz!) {
  insert_Authorizations_one(object: {
    idToken: $idToken
    tenantId: 1
    status: "Accepted"
    cacheExpiryDateTime: $expiresAt
    chargingPriority: 5
    createdAt: "now()"
    updatedAt: "now()"
  }) {
    id
    idToken
    cacheExpiryDateTime
    chargingPriority
  }
}
```

**Variables:**
```json
{
  "idToken": "GUEST-USER123-SESSION456",
  "expiresAt": "2025-12-23T15:00:00Z"
}
```

**Use Case:** When guest books 2pm-3pm, create token that expires at 3pm

---

### Create Host Authorization (Permanent)

```graphql
mutation CreateHostAuthorization($idToken: String!, $userId: Int!) {
  insert_Authorizations_one(object: {
    idToken: $idToken
    tenantId: 1
    status: "Accepted"
    cacheExpiryDateTime: null
    chargingPriority: 10
    createdAt: "now()"
    updatedAt: "now()"
  }) {
    id
    idToken
    status
    chargingPriority
  }
}
```

**Variables:**
```json
{
  "idToken": "HOST-JAKE-MAIN-CHARGER",
  "userId": 42
}
```

**Use Case:** When host first registers their charger

---

### Cancel Reservation (Delete Authorization)

```graphql
mutation CancelReservation($idToken: String!) {
  delete_Authorizations(where: {idToken: {_eq: $idToken}}) {
    affected_rows
    returning {
      id
      idToken
    }
  }
}
```

**Variables:**
```json
{
  "idToken": "GUEST-USER123-SESSION456"
}
```

**Use Case:** When guest cancels their reservation

---

### Check If Token Valid

```graphql
query CheckAuthorization($idToken: String!) {
  Authorizations(where: {idToken: {_eq: $idToken}}) {
    id
    status
    cacheExpiryDateTime
    chargingPriority
  }
}
```

**Client-side logic:**
```javascript
const now = new Date();
const auth = data.Authorizations[0];

if (!auth) {
  status = 'UNAUTHORIZED';
} else if (auth.status !== 'Accepted') {
  status = 'BLOCKED';
} else if (auth.cacheExpiryDateTime && new Date(auth.cacheExpiryDateTime) < now) {
  status = 'EXPIRED';
} else {
  status = 'VALID';
}
```

---

## 2. Session Data (For Host/Guest Views)

### Get Active Session for Charger

```graphql
query GetActiveSession($stationId: String!) {
  Transactions(
    where: {
      stationId: {_eq: $stationId}
      isActive: {_eq: true}
    }
    limit: 1
  ) {
    transactionId
    totalKwh
    timeSpentCharging
    startTime
    chargingState

    # Join to get latest meter reading
    OCPPMessages(
      where: {action: {_eq: "MeterValues"}}
      order_by: {createdAt: desc}
      limit: 1
    ) {
      createdAt
      message
    }
  }
}
```

**Use Case:** Display real-time charging stats to Host/Guest

**Response Processing:**
```javascript
// Extract current meter value from OCPP message
const latestMessage = session.OCPPMessages[0];
if (latestMessage) {
  const meterValue = latestMessage.message[3]?.meterValue?.[0]?.sampledValue?.[0]?.value;
  const currentKwh = meterValue / 1000; // Convert Wh to kWh
}
```

---

### Get Session History (Past Sessions)

```graphql
query GetSessionHistory($stationId: String!, $limit: Int = 10) {
  Transactions(
    where: {
      stationId: {_eq: $stationId}
      isActive: {_eq: false}
      stopTime: {_is_null: false}
    }
    order_by: {stopTime: desc}
    limit: $limit
  ) {
    transactionId
    totalKwh
    timeSpentCharging
    startTime
    stopTime
    meterStart
    meterStop

    # Calculate cost client-side based on your pricing
  }
}
```

**Use Case:** Show Host their revenue history, Guest their charging history

---

### Get All Sessions for Guest (Across All Chargers)

```graphql
query GetGuestSessions($guestIdToken: String!) {
  Transactions(
    where: {
      idToken: {_eq: $guestIdToken}
    }
    order_by: {startTime: desc}
    limit: 20
  ) {
    transactionId
    stationId
    totalKwh
    startTime
    stopTime
    timeSpentCharging

    # Get charger details
    ChargingStation {
      id
      chargePointVendor
      Location {
        name
        address
        city
      }
    }
  }
}
```

**Use Case:** Guest's "My Sessions" page

---

## 3. Charger Status (For Host Dashboard)

### Get Charger Real-Time Status

```graphql
query GetChargerStatus($stationId: String!) {
  ChargingStations_by_pk(id: $stationId) {
    id
    isOnline
    firmwareVersion
    chargePointVendor
    chargePointModel

    # Latest heartbeat
    OCPPMessages(
      where: {action: {_eq: "Heartbeat"}}
      order_by: {createdAt: desc}
      limit: 1
    ) {
      createdAt
    }

    # Connector status
    Connectors {
      connectorId
      status
      type
      maximumPowerWatts
    }

    # Active session
    Transactions(where: {isActive: {_eq: true}}, limit: 1) {
      transactionId
      totalKwh
      startTime
    }
  }
}
```

**Use Case:** Host's dashboard showing charger health

---

### Get All Host's Chargers

```graphql
query GetHostChargers($hostId: Int!) {
  ChargingStations(
    where: {
      # Add hostId field to your schema
      # OR filter by location owned by host
    }
  ) {
    id
    isOnline
    Location {
      name
      address
    }

    # Count active sessions
    Transactions_aggregate(where: {isActive: {_eq: true}}) {
      aggregate {
        count
      }
    }

    # Today's revenue (client-side calculation)
    Transactions(
      where: {
        startTime: {_gte: "today()"}
        isActive: {_eq: false}
      }
    ) {
      totalKwh
    }
  }
}
```

---

## 4. Security / Unauthorized Access Detection

### Get Unauthorized Attempts at My Charger

```graphql
query GetUnauthorizedAttempts($stationId: String!, $since: timestamptz!) {
  OCPPMessages(
    where: {
      stationId: {_eq: $stationId}
      action: {_eq: "Authorize"}
      createdAt: {_gte: $since}
    }
    order_by: {createdAt: desc}
  ) {
    createdAt
    message
  }
}
```

**Client-side processing:**
```javascript
const unauthorizedAttempts = messages.filter(msg => {
  const request = msg.message[3]; // OCPP message format
  const idTag = request.idTag;

  // Check if this idTag exists in Authorizations table
  // If not → unauthorized attempt
  return !knownTokens.includes(idTag);
});
```

**Use Case:** Host sees "3 unauthorized attempts in the last hour"

---

## 5. Real-Time Updates (Subscriptions)

### Subscribe to Active Session Updates

```graphql
subscription WatchActiveSession($stationId: String!) {
  Transactions(
    where: {
      stationId: {_eq: $stationId}
      isActive: {_eq: true}
    }
  ) {
    transactionId
    totalKwh
    timeSpentCharging
    updatedAt
  }
}
```

**Use Case:** Live stats update automatically without polling

**React/React Native Example:**
```javascript
import { useSubscription } from '@apollo/client';

function LiveStats({ stationId }) {
  const { data, loading } = useSubscription(WATCH_ACTIVE_SESSION, {
    variables: { stationId }
  });

  if (loading) return <Text>Loading...</Text>;

  const session = data?.Transactions?.[0];
  return (
    <View>
      <Text>{session.totalKwh} kWh</Text>
      <Text>{formatDuration(session.timeSpentCharging)}</Text>
    </View>
  );
}
```

---

### Subscribe to Charger Status Changes

```graphql
subscription WatchChargerStatus($stationId: String!) {
  ChargingStations(where: {id: {_eq: $stationId}}) {
    isOnline
    updatedAt

    Connectors {
      connectorId
      status
    }
  }
}
```

**Use Case:** Host sees charger go offline/online in real-time

---

## 6. Billing Calculations

### Get Billing Data for Completed Session

```graphql
query GetSessionBillingData($transactionId: String!) {
  Transactions_by_pk(transactionId: $transactionId) {
    transactionId
    totalKwh
    timeSpentCharging
    startTime
    stopTime
    meterStart
    meterStop

    # If you add overstay tracking
    overstayMinutes
    overstayFee

    # Get charger location for tax calculation
    ChargingStation {
      Location {
        city
        state
        # Use for sales tax
      }
    }
  }
}
```

**Client-side calculation:**
```javascript
function calculateBill(session, pricing) {
  const baseRate = pricing.perKwh; // e.g., $0.50/kWh
  const energyCost = session.totalKwh * baseRate;

  // Time-based fee (optional)
  const timeFee = (session.timeSpentCharging / 3600) * pricing.perHour;

  // Overstay penalty
  const overstayFee = session.overstayMinutes
    ? (session.overstayMinutes / 60) * pricing.overstayRate
    : 0;

  const subtotal = energyCost + timeFee + overstayFee;
  const tax = subtotal * pricing.taxRate;

  return {
    energyCost,
    timeFee,
    overstayFee,
    subtotal,
    tax,
    total: subtotal + tax
  };
}
```

---

## 7. Batch Operations (Admin/Testing)

### Create Multiple Guest Tokens at Once

```graphql
mutation CreateMultipleGuestTokens($guests: [Authorizations_insert_input!]!) {
  insert_Authorizations(objects: $guests) {
    affected_rows
    returning {
      id
      idToken
      cacheExpiryDateTime
    }
  }
}
```

**Variables:**
```json
{
  "guests": [
    {
      "idToken": "GUEST-SESSION-1",
      "tenantId": 1,
      "status": "Accepted",
      "cacheExpiryDateTime": "2025-12-23T15:00:00Z",
      "chargingPriority": 5
    },
    {
      "idToken": "GUEST-SESSION-2",
      "tenantId": 1,
      "status": "Accepted",
      "cacheExpiryDateTime": "2025-12-23T16:00:00Z",
      "chargingPriority": 5
    }
  ]
}
```

---

## 8. Analytics / Reporting

### Host Revenue Summary (This Month)

```graphql
query GetMonthlyRevenue($stationId: String!, $monthStart: timestamptz!) {
  Transactions_aggregate(
    where: {
      stationId: {_eq: $stationId}
      startTime: {_gte: $monthStart}
      isActive: {_eq: false}
    }
  ) {
    aggregate {
      sum {
        totalKwh
      }
      count
      avg {
        totalKwh
      }
    }
  }

  # Group by day for chart
  Transactions(
    where: {
      stationId: {_eq: $stationId}
      startTime: {_gte: $monthStart}
      isActive: {_eq: false}
    }
    order_by: {startTime: asc}
  ) {
    startTime
    totalKwh
  }
}
```

**Client-side processing:**
```javascript
const totalKwh = data.Transactions_aggregate.aggregate.sum.totalKwh;
const totalSessions = data.Transactions_aggregate.aggregate.count;
const avgKwhPerSession = data.Transactions_aggregate.aggregate.avg.totalKwh;

// Calculate revenue
const revenue = totalKwh * pricePerKwh;

// Group by day for chart
const dailyRevenue = groupByDay(data.Transactions);
```

---

## Testing Examples

### Test Script (Node.js)

```javascript
const fetch = require('node-fetch');

const HASURA_URL = 'https://juicehub-hasura.onrender.com/v1/graphql';
const ADMIN_SECRET = 'your-secret-here';

async function createGuestToken(idToken, expiresAt) {
  const mutation = {
    query: `
      mutation CreateGuest($idToken: String!, $expiresAt: timestamptz!) {
        insert_Authorizations_one(object: {
          idToken: $idToken
          tenantId: 1
          status: "Accepted"
          cacheExpiryDateTime: $expiresAt
          chargingPriority: 5
        }) {
          id
          idToken
        }
      }
    `,
    variables: { idToken, expiresAt }
  };

  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET
    },
    body: JSON.stringify(mutation)
  });

  const data = await response.json();
  console.log('Created token:', data.data.insert_Authorizations_one);
  return data;
}

// Test: Create token expiring in 1 hour
const oneHourFromNow = new Date(Date.now() + 3600000).toISOString();
createGuestToken('TEST-GUEST-001', oneHourFromNow);
```

---

### Test Script (cURL)

```bash
#!/bin/bash
# test-create-guest.sh

HASURA_URL="https://juicehub-hasura.onrender.com/v1/graphql"
ADMIN_SECRET="your-secret-here"

# Create guest token expiring in 1 hour
EXPIRES_AT=$(date -u -v+1H '+%Y-%m-%dT%H:%M:%SZ')

curl -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"mutation { insert_Authorizations_one(object: {idToken: \\\"TEST-GUEST-001\\\", tenantId: 1, status: \\\"Accepted\\\", cacheExpiryDateTime: \\\"$EXPIRES_AT\\\", chargingPriority: 5}) { id idToken cacheExpiryDateTime } }\"
  }" | jq .

echo "Token created, expires at: $EXPIRES_AT"
```

---

## Production Checklist

### Before Deploying to JuiceNet App:

- [ ] Replace `x-hasura-admin-secret` with JWT authentication
- [ ] Set up Hasura user roles (host, guest, admin)
- [ ] Configure row-level security (users only see their own data)
- [ ] Add rate limiting
- [ ] Enable query depth limiting (prevent malicious queries)
- [ ] Set up monitoring/logging
- [ ] Configure CORS for your app domain
- [ ] Test all subscriptions work over WebSocket
- [ ] Load test with realistic user count

---

## Next Steps

1. **Test these queries** using Hasura Console (https://juicehub-hasura.onrender.com/console)
2. **Integrate into your React Native app** using Apollo Client
3. **Add authentication** (JWT tokens from your auth system)
4. **Configure permissions** in Hasura for host/guest roles

**All of this works RIGHT NOW** - no backend code changes needed! 🚀

---

**Questions or issues?** Refer to:
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Technical details
- [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) - Problem solving
