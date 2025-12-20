#!/bin/bash
# Post-deployment health check for JuiceHub on Render.com

# Get the deployment URL from user or use default
CORE_URL="${1:-https://juicehub-core.onrender.com}"

echo "🏥 JuiceHub Deployment Health Check"
echo "====================================="
echo "Checking: $CORE_URL"
echo ""

# 1. Check health endpoint
echo "1️⃣  Checking health endpoint..."
health_response=$(curl -s -o /dev/null -w "%{http_code}" "$CORE_URL/health" || echo "000")

if [ "$health_response" = "200" ]; then
  echo "✅ Health check passed (HTTP $health_response)"
else
  echo "❌ Health check failed (HTTP $health_response)"
  echo "   The service may still be starting up. Wait 1-2 minutes and try again."
  exit 1
fi
echo ""

# 2. Check if server responds
echo "2️⃣  Checking server response..."
server_response=$(curl -s -w "%{http_code}" "$CORE_URL" -o /dev/null || echo "000")

if [ "$server_response" != "000" ]; then
  echo "✅ Server is responding (HTTP $server_response)"
else
  echo "❌ Server not responding"
  exit 1
fi
echo ""

# 3. Check OCPP WebSocket endpoint (just connection, don't send data)
echo "3️⃣  Checking WebSocket endpoint..."
echo "   (Checking if WebSocket upgrade is available)"

ws_check=$(curl -s -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "$CORE_URL/ocpp" | head -n 1)

if echo "$ws_check" | grep -q "101"; then
  echo "✅ WebSocket endpoint available"
elif echo "$ws_check" | grep -q "400"; then
  echo "⚠️  WebSocket endpoint exists but requires OCPP handshake (expected)"
else
  echo "ℹ️  WebSocket check inconclusive: $ws_check"
fi
echo ""

# 4. Summary
echo "📊 Deployment Status Summary:"
echo "  • Health endpoint: ✅"
echo "  • Server responding: ✅"
echo "  • Deployment URL: $CORE_URL"
echo ""
echo "🎉 Deployment is healthy and ready to accept connections!"
echo ""
echo "📝 Next steps:"
echo "  1. Check Render logs for any startup warnings"
echo "  2. Test OCPP charging station connection"
echo "  3. Verify database connectivity (check logs)"
echo "  4. Monitor for 24 hours to ensure stability"
