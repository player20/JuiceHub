#!/bin/bash
# Test Authorization Flow
# Tests the complete guest booking → charging → expiry flow

set -e

HASURA_URL="${HASURA_URL:-https://juicehub-hasura.onrender.com/v1/graphql}"
ADMIN_SECRET="${HASURA_ADMIN_SECRET:-devadmin123}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "   JuiceHub Authorization Flow Test"
echo "================================================"
echo ""

# Test 1: Create Guest Token
echo -e "${YELLOW}Test 1: Create Guest Authorization${NC}"
echo "Creating token that expires in 1 hour..."

TOKEN="TEST-GUEST-$(date +%s)"
EXPIRES_AT=$(date -u -v+1H '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '+1 hour' '+%Y-%m-%dT%H:%M:%SZ')

RESPONSE=$(curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"mutation { insert_Authorizations_one(object: {idToken: \\\"$TOKEN\\\", tenantId: 1, status: \\\"Accepted\\\", cacheExpiryDateTime: \\\"$EXPIRES_AT\\\", chargingPriority: 5, createdAt: \\\"now()\\\", updatedAt: \\\"now()\\\"}) { id idToken status cacheExpiryDateTime chargingPriority } }\"
  }")

AUTH_ID=$(echo "$RESPONSE" | jq -r '.data.insert_Authorizations_one.id')

if [ "$AUTH_ID" != "null" ] && [ -n "$AUTH_ID" ]; then
  echo -e "${GREEN}✓ Token created successfully${NC}"
  echo "  ID: $AUTH_ID"
  echo "  Token: $TOKEN"
  echo "  Expires: $EXPIRES_AT"
else
  echo -e "${RED}✗ Failed to create token${NC}"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo ""

# Test 2: Verify Token Exists
echo -e "${YELLOW}Test 2: Verify Token Exists${NC}"

RESPONSE=$(curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { Authorizations(where: {idToken: {_eq: \\\"$TOKEN\\\"}}) { id status cacheExpiryDateTime chargingPriority } }\"
  }")

COUNT=$(echo "$RESPONSE" | jq '.data.Authorizations | length')

if [ "$COUNT" -eq "1" ]; then
  echo -e "${GREEN}✓ Token found in database${NC}"
  echo "$RESPONSE" | jq '.data.Authorizations[0]'
else
  echo -e "${RED}✗ Token not found${NC}"
  exit 1
fi

echo ""

# Test 3: Check Token Status (Should be Valid)
echo -e "${YELLOW}Test 3: Check Token Status${NC}"

STATUS=$(echo "$RESPONSE" | jq -r '.data.Authorizations[0].status')
EXPIRY=$(echo "$RESPONSE" | jq -r '.data.Authorizations[0].cacheExpiryDateTime')
NOW=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

echo "  Status: $STATUS"
echo "  Expires: $EXPIRY"
echo "  Now: $NOW"

if [ "$STATUS" = "Accepted" ]; then
  echo -e "${GREEN}✓ Token is Accepted${NC}"
else
  echo -e "${RED}✗ Token status is not Accepted: $STATUS${NC}"
  exit 1
fi

# Check if not expired
if [[ "$EXPIRY" > "$NOW" ]]; then
  echo -e "${GREEN}✓ Token has not expired${NC}"
else
  echo -e "${RED}✗ Token is already expired${NC}"
  exit 1
fi

echo ""

# Test 4: Create Host Token (Permanent)
echo -e "${YELLOW}Test 4: Create Host Token (Permanent)${NC}"

HOST_TOKEN="TEST-HOST-$(date +%s)"

RESPONSE=$(curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"mutation { insert_Authorizations_one(object: {idToken: \\\"$HOST_TOKEN\\\", tenantId: 1, status: \\\"Accepted\\\", cacheExpiryDateTime: null, chargingPriority: 10, createdAt: \\\"now()\\\", updatedAt: \\\"now()\\\"}) { id idToken chargingPriority } }\"
  }")

HOST_ID=$(echo "$RESPONSE" | jq -r '.data.insert_Authorizations_one.id')

if [ "$HOST_ID" != "null" ] && [ -n "$HOST_ID" ]; then
  echo -e "${GREEN}✓ Host token created${NC}"
  echo "  ID: $HOST_ID"
  echo "  Token: $HOST_TOKEN"
  echo "  Priority: 10 (Host)"
  echo "  Expires: NEVER"
else
  echo -e "${RED}✗ Failed to create host token${NC}"
  exit 1
fi

echo ""

# Test 5: List All Test Tokens
echo -e "${YELLOW}Test 5: List All Test Tokens${NC}"

RESPONSE=$(curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"query { Authorizations(where: {idToken: {_like: \\\"TEST-%\\\"}}, order_by: {createdAt: desc}) { id idToken status cacheExpiryDateTime chargingPriority createdAt } }\"
  }")

echo "$RESPONSE" | jq '.data.Authorizations'

echo ""

# Test 6: Update Token (Block it)
echo -e "${YELLOW}Test 6: Block Guest Token${NC}"

RESPONSE=$(curl -s -X POST "$HASURA_URL" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $ADMIN_SECRET" \
  -d "{
    \"query\": \"mutation { update_Authorizations(where: {idToken: {_eq: \\\"$TOKEN\\\"}}, _set: {status: \\\"Blocked\\\", updatedAt: \\\"now()\\\"}) { affected_rows returning { id status } } }\"
  }")

AFFECTED=$(echo "$RESPONSE" | jq -r '.data.update_Authorizations.affected_rows')

if [ "$AFFECTED" -eq "1" ]; then
  echo -e "${GREEN}✓ Token blocked successfully${NC}"
  echo "$RESPONSE" | jq '.data.update_Authorizations.returning[0]'
else
  echo -e "${RED}✗ Failed to block token${NC}"
  exit 1
fi

echo ""

# Test 7: Delete Tokens (Cleanup)
echo -e "${YELLOW}Test 7: Cleanup - Delete Test Tokens${NC}"

read -p "Delete test tokens? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  RESPONSE=$(curl -s -X POST "$HASURA_URL" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $ADMIN_SECRET" \
    -d "{
      \"query\": \"mutation { delete_Authorizations(where: {idToken: {_like: \\\"TEST-%\\\"}}) { affected_rows } }\"
    }")

  DELETED=$(echo "$RESPONSE" | jq -r '.data.delete_Authorizations.affected_rows')

  echo -e "${GREEN}✓ Deleted $DELETED test tokens${NC}"
else
  echo -e "${YELLOW}⚠ Skipping cleanup - test tokens remain in database${NC}"
  echo "  Guest token: $TOKEN"
  echo "  Host token: $HOST_TOKEN"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo "================================================"
