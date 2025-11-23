#!/bin/bash

# Test script for the review can-review endpoint fix
# This script tests that the endpoint now responds correctly

BASE_URL="${1:-https://123create-construction-app-with-a.launchpulse.ai}"

echo "=================================="
echo "Testing Review Endpoint Fix"
echo "=================================="
echo ""

# First, login as sarah.builder@example.com to get a token
echo "1. Logging in as sarah.builder@example.com..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.builder@example.com",
    "password": "Password123!@#"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to obtain authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Successfully logged in"
echo ""

# Test the can-review endpoint for prod_010
echo "2. Testing /api/reviews/can-review/prod_010 endpoint..."
REVIEW_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  "${BASE_URL}/api/reviews/can-review/prod_010" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$REVIEW_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$REVIEW_RESPONSE" | grep -v "HTTP_CODE")

echo "HTTP Status: $HTTP_CODE"
echo "Response Body: $BODY"
echo ""

# Check if the response is successful
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Endpoint responding correctly (HTTP 200)"
  
  # Check if can_review field exists
  if echo "$BODY" | grep -q "can_review"; then
    echo "✅ Response contains 'can_review' field"
    
    # Check if can_review is true
    if echo "$BODY" | grep -q '"can_review":true'; then
      echo "✅ Customer can write a review (can_review: true)"
      echo "✅ ALL TESTS PASSED - Write a Review button should now appear!"
    elif echo "$BODY" | grep -q '"can_review":false'; then
      echo "⚠️  Customer cannot review yet (can_review: false)"
      echo "   This may be expected if:"
      echo "   - Order hasn't been delivered yet"
      echo "   - Customer already reviewed this product"
      echo "   - Customer hasn't ordered this product"
      MESSAGE=$(echo "$BODY" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
      echo "   Message: $MESSAGE"
    fi
  else
    echo "❌ Response missing 'can_review' field"
    echo "   Something might still be wrong"
  fi
else
  echo "❌ Endpoint returned HTTP $HTTP_CODE (expected 200)"
  
  if [ "$HTTP_CODE" = "404" ]; then
    echo "❌ ROUTE MATCHING ISSUE STILL EXISTS"
    echo "   The endpoint is still returning 404"
    echo "   This means the route ordering fix may not have taken effect"
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ AUTHENTICATION ISSUE"
    echo "   Token may be invalid or expired"
  fi
fi

echo ""
echo "=================================="
echo "Test Complete"
echo "=================================="
