#!/bin/bash

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.contractor@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Clear cart first
curl -s -X DELETE http://localhost:3000/api/cart \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Add first item
echo "Adding item 1 (Kohler Faucet)..."
curl -s -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id":"prod_007","quantity":2}' > /dev/null

# Add second item
echo "Adding item 2 (LED Bulb)..."
curl -s -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id":"prod_006","quantity":3}' > /dev/null

# Get cart
echo -e "\nGetting cart..."
CART_RESPONSE=$(curl -s http://localhost:3000/api/cart \
  -H "Authorization: Bearer $TOKEN")

# Pretty print with jq if available, otherwise just echo
if command -v jq &> /dev/null; then
  echo "$CART_RESPONSE" | jq '.'
else
  echo "$CART_RESPONSE"
fi

# Check result
ITEMS_ARRAY=$(echo "$CART_RESPONSE" | grep -o '"items":\[[^]]*\]')
if [[ "$ITEMS_ARRAY" == *"prod_007"* ]] && [[ "$ITEMS_ARRAY" == *"prod_006"* ]]; then
  echo -e "\n✓ SUCCESS: Cart persistence is working! Both items are in the cart."
else
  echo -e "\n✗ FAILED: Cart items not persisting correctly"
fi
