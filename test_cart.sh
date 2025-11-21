#!/bin/bash

# Login to get token
echo "=== Logging in ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.contractor@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."

# Add item to cart
echo -e "\n=== Adding item to cart ==="
ADD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id":"prod_001","quantity":5}')
echo "Add response: $ADD_RESPONSE"

# Get cart
echo -e "\n=== Getting cart ==="
CART_RESPONSE=$(curl -s http://localhost:3000/api/cart \
  -H "Authorization: Bearer $TOKEN")
echo "Cart response: $CART_RESPONSE"

# Check if cart has items
ITEM_COUNT=$(echo $CART_RESPONSE | grep -o '"total_items":[0-9]*' | cut -d':' -f2)
echo -e "\n=== Result ==="
if [ "$ITEM_COUNT" != "0" ] && [ ! -z "$ITEM_COUNT" ]; then
  echo "✓ SUCCESS: Cart has $ITEM_COUNT items"
else
  echo "✗ FAILED: Cart is empty"
fi
