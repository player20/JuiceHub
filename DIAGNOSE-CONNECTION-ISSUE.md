# Charger Connection/Disconnection Diagnosis
**Date**: January 7, 2026
**Issue**: Charger connecting then immediately disconnecting

---

## 🔍 Check Render Logs NOW

### Step 1: Find the Disconnect Reason

1. **Go to** https://dashboard.render.com
2. **Navigate to** juicehub-core → Logs
3. **Search for** (in order of priority):

#### A. Search: `close`
Look for WebSocket close messages with reason codes:
```
WebSocket close: code=1000  // Normal closure (OK)
WebSocket close: code=1001  // Going away (charger shutting down)
WebSocket close: code=1002  // Protocol error (BAD)
WebSocket close: code=1006  // Abnormal closure (NETWORK ISSUE)
WebSocket close: code=1011  // Server error (BAD)
```

#### B. Search: `ping` or `pong`
Look for ping/pong timeout messages:
```
No pong received from WALLBOX-HOME-001
Connection terminated: ping timeout
```

#### C. Search: `authentication` or `authenticate`
Look for auth failures:
```
Authentication failed for WALLBOX-HOME-001
Basic auth credentials invalid
Station not found in database
```

#### D. Search: `WALLBOX-HOME-001`
Look for any error messages specific to your charger.

---

## 🚨 Common Causes & Fixes

### **Issue 1: Ping/Pong Timeout** (MOST COMMON)

**Symptom**: Charger connects, then disconnects after ~30-60 seconds

**Logs show**:
```
Connection established for WALLBOX-HOME-001
... 60 seconds later ...
No pong received, closing connection
```

**Root Cause**: Charger not responding to WebSocket ping frames

**Fix**:
```typescript
// Check ping interval in config
// File: Core/Server/src/config/envs/docker.ts

websocketServers: [
  {
    id: 'ocpp16',
    protocol: 'ocpp1.6',
    pingInterval: 60000,  // 60 seconds - INCREASE THIS
```

**ACTION**: Change `pingInterval` to `120000` (2 minutes) or `300000` (5 minutes)

---

### **Issue 2: Authentication Failure**

**Symptom**: Charger connects, auth fails, disconnect immediately

**Logs show**:
```
Connection attempt from WALLBOX-HOME-001
Authentication failed: station not found
Closing connection with code 1008
```

**Root Cause**: Charger not in database OR wrong credentials

**Fix Option A** - Add charger to database:
```sql
-- Check if charger exists
SELECT * FROM "ChargingStations" WHERE "stationId" = 'WALLBOX-HOME-001';

-- If not found, insert
INSERT INTO "ChargingStations" ("stationId", "createdAt", "updatedAt")
VALUES ('WALLBOX-HOME-001', NOW(), NOW());
```

**Fix Option B** - Disable authentication temporarily:
```typescript
// File: Core/Server/src/config/envs/docker.ts
// Change authenticator to allow unknown stations

authenticator: {
  unknownStationFilterEnabled: false,  // TEMPORARY - allows any charger
```

---

### **Issue 3: Network Instability**

**Symptom**: Charger connects/disconnects randomly, no pattern

**Logs show**:
```
Connection established
Connection closed: code=1006 (abnormal closure)
Connection established
Connection closed: code=1006 (abnormal closure)
```

**Root Cause**: Network issues (WiFi, cellular, firewall)

**Fix**:
1. **Check charger WiFi signal strength** (Wallbox app)
2. **Restart charger** (power cycle)
3. **Check firewall** - ensure WebSocket port open (default: 9000)
4. **Check Render logs** for "Connection timeout" messages

---

### **Issue 4: Protocol Version Mismatch**

**Symptom**: Charger connects, protocol negotiation fails

**Logs show**:
```
Unsupported protocol version: ocpp1.5
Expected: ocpp1.6
```

**Root Cause**: Charger using wrong OCPP version

**Fix**:
1. **Check charger settings** (Wallbox app → Settings → OCPP)
2. **Ensure**: Protocol = OCPP 1.6
3. **WebSocket URL**: Should include `/ocpp16` path

---

### **Issue 5: Certificate/TLS Issues** (If using HTTPS)

**Symptom**: Connection fails during TLS handshake

**Logs show**:
```
TLS handshake failed
Certificate verification failed
```

**Root Cause**: Invalid SSL certificate or mutual TLS (mTLS) misconfiguration

**Fix**:
1. **Check Render SSL certificate** is valid
2. **If using mTLS**: Charger needs client certificate
3. **Temporary**: Switch to HTTP (security profile 0) for testing

---

## ✅ Quick Diagnostic Commands

### Check Connection Status
```bash
# In Render logs, count connect/disconnect events
grep -c "Connection established" logs.txt
grep -c "Connection closed" logs.txt

# If disconnect count ≈ connect count → charger not staying connected
```

### Find Disconnect Reason
```bash
# Search logs for close code
grep "close.*code=" logs.txt

# Common codes:
# 1000 = Normal (OK)
# 1006 = Abnormal/network issue (BAD)
# 1008 = Policy violation/auth failure (BAD)
# 1011 = Server error (BAD)
```

---

## 🎯 IMMEDIATE ACTION PLAN

### **Step 1**: Identify the Issue (5 minutes)

Run these searches in Render logs (last 1 hour):

1. Search: `WALLBOX-HOME-001` → Find all events
2. Search: `close` → Find disconnect reason codes
3. Search: `ping` → Check for ping/pong timeouts
4. Search: `auth` → Check for authentication failures

### **Step 2**: Apply the Fix (10 minutes)

Based on what you find:

**If ping timeout** → Increase pingInterval to 120000 or 300000
**If auth failure** → Add charger to database OR disable unknownStationFilter
**If network issue** → Check WiFi signal, restart charger, check firewall
**If protocol mismatch** → Configure charger for OCPP 1.6

### **Step 3**: Test (2 minutes)

After applying fix:
1. Restart charger (power cycle)
2. Watch Render logs for "Connection established"
3. Wait 5 minutes - ensure NO "Connection closed" message
4. Search for "Heartbeat" - should see regular heartbeats

---

## 📊 What You Should See When Working

**Healthy Connection Pattern**:
```
[12:00:00] Connection established for WALLBOX-HOME-001
[12:00:05] BootNotification received
[12:00:05] BootNotification accepted
[12:01:00] Heartbeat received from WALLBOX-HOME-001
[12:02:00] Heartbeat received from WALLBOX-HOME-001
[12:03:00] Heartbeat received from WALLBOX-HOME-001
... (heartbeats every 60-300 seconds)
```

**Unhealthy Connection Pattern**:
```
[12:00:00] Connection established for WALLBOX-HOME-001
[12:00:30] No pong received, closing connection
[12:00:30] Connection closed: code=1006

[12:01:00] Connection established for WALLBOX-HOME-001  // Reconnect attempt
[12:01:30] No pong received, closing connection
[12:01:30] Connection closed: code=1006
```

---

## 🆘 If Nothing Works

### Last Resort Fixes

**1. Simplest Config** (removes all possible issues):
```typescript
// Core/Server/src/config/envs/docker.ts

websocketServers: [
  {
    id: 'ocpp16',
    protocol: 'ocpp1.6',
    host: '0.0.0.0',
    port: 9000,
    securityProfile: 0,  // No TLS
    pingInterval: 300000,  // 5 minutes - very long timeout
  }
],

authenticator: {
  unknownStationFilterEnabled: false,  // Allow all chargers
  basicAuthFilterEnabled: false,  // No auth required
}
```

**2. Restart Everything**:
```bash
# 1. Restart charger (power cycle)
# 2. Restart Core service on Render
#    - Render Dashboard → juicehub-core → Manual Deploy → Restart
# 3. Clear Redis cache (if using)
```

**3. Check Charger Firmware**:
- Wallbox app → Settings → About
- Check firmware version
- Update if available

---

## 📞 What to Share If You Need Help

1. **Screenshot of Render logs** showing:
   - Connection established message
   - Connection closed message with code
   - Any error messages between them

2. **Charger settings** from Wallbox app:
   - OCPP protocol version
   - WebSocket URL
   - Connection status

3. **Time pattern**:
   - How long after connecting does it disconnect? (seconds)
   - Does it reconnect automatically?
   - Is the pattern consistent or random?

---

**Last Updated**: January 7, 2026 1:15 AM PST
**Status**: CRITICAL - Blocking all charging functionality
