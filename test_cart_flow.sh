#!/bin/bash

# Test script to verify cart functionality
# This simulates the browser test flow

set -e

BASE_URL="${1:-http://localhost:3000}"
API_URL="$BASE_URL/api"

echo "=== Testing Cart Persistence Flow ==="
echo "Base URL: $BASE_URL"
echo ""

# Step 1: Login
echo "Step 1: Login as customer..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.builder@example.com",
    "password": "password123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.user_id')
CUSTOMER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.customer.customer_id // empty')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✓ Login successful"
echo "  Token: ${TOKEN:0:20}..."
echo "  User ID: $USER_ID"
echo "  Customer ID: $CUSTOMER_ID"
echo ""

# Step 2: Get a product to add to cart
echo "Step 2: Fetching products..."
PRODUCTS_RESPONSE=$(curl -s -X GET "$API_URL/products?limit=1&status=active" \
  -H "Authorization: Bearer $TOKEN")

PRODUCT_ID=$(echo "$PRODUCTS_RESPONSE" | jq -r '.products[0].product_id // empty')

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" == "null" ]; then
  echo "❌ No products found!"
  echo "Response: $PRODUCTS_RESPONSE"
  exit 1
fi

echo "✓ Found product: $PRODUCT_ID"
echo ""

# Step 3: Add product to cart
echo "Step 3: Adding product to cart..."
ADD_TO_CART_RESPONSE=$(curl -s -X POST "$API_URL/cart/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"product_id\": \"$PRODUCT_ID\",
    \"quantity\": 2
  }")

CART_ITEM_ID=$(echo "$ADD_TO_CART_RESPONSE" | jq -r '.cart_item_id // empty')

if [ -z "$CART_ITEM_ID" ] || [ "$CART_ITEM_ID" == "null" ]; then
  echo "❌ Failed to add to cart!"
  echo "Response: $ADD_TO_CART_RESPONSE"
  exit 1
fi

echo "✓ Added to cart successfully"
echo "  Cart Item ID: $CART_ITEM_ID"
echo ""

# Step 4: Retrieve cart (simulate page navigation)
echo "Step 4: Retrieving cart (simulating checkout page load)..."
CART_RESPONSE=$(curl -s -X GET "$API_URL/cart" \
  -H "Authorization: Bearer $TOKEN")

CART_TOTAL_ITEMS=$(echo "$CART_RESPONSE" | jq -r '.total_items // 0')
CART_ITEMS_COUNT=$(echo "$CART_RESPONSE" | jq -r '.items | length')

echo "Cart Response: $CART_RESPONSE"
echo ""

if [ "$CART_TOTAL_ITEMS" -eq 0 ]; then
  echo "❌ CART IS EMPTY! This is the bug."
  echo "Total items in cart: $CART_TOTAL_ITEMS"
  echo "Number of cart items: $CART_ITEMS_COUNT"
  exit 1
fi

echo "✓ Cart retrieved successfully"
echo "  Total items: $CART_TOTAL_ITEMS"
echo "  Number of line items: $CART_ITEMS_COUNT"
echo ""

echo "=== All tests passed! ✓ ==="
