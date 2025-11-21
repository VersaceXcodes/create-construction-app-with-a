#!/bin/bash

# Test supplier login endpoint
echo "Testing supplier login..."
RESPONSE=$(curl -s -X POST https://123create-construction-app-with-a.launchpulse.ai/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"supplier.acme@example.com","password":"supplier123"}')

echo "Login Response:"
echo "$RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$RESPONSE" | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo ""
  echo "Token extracted successfully!"
  echo ""
  
  # Test /api/suppliers/me endpoint
  echo "Testing /api/suppliers/me endpoint..."
  curl -s -X GET https://123create-construction-app-with-a.launchpulse.ai/api/suppliers/me \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' | jq '.'
else
  echo "Failed to extract token!"
fi
