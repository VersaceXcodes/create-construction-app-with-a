#!/bin/bash

# Test script to verify Supplier Analytics token fix
echo "======================================"
echo "Supplier Analytics Token Fix Test"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:3000}"

echo "Testing against: $API_URL"
echo ""

# Step 1: Login as supplier
echo "Step 1: Logging in as supplier..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "supplier@buildeasy.com",
    "password": "supplier123"
  }')

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//' | sed 's/"//')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed - no token received${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Test Dashboard Analytics
echo "Step 2: Testing Dashboard Analytics..."
DASHBOARD_RESPONSE=$(curl -s -X GET "$API_URL/api/suppliers/me/analytics/dashboard?date_range=last_30_days" \
  -H "Authorization: Bearer $TOKEN")

if echo "$DASHBOARD_RESPONSE" | grep -q "Invalid or expired token"; then
  echo -e "${RED}❌ Dashboard Analytics - Token Error${NC}"
  echo "Response: $DASHBOARD_RESPONSE"
  exit 1
elif echo "$DASHBOARD_RESPONSE" | grep -q "total_sales"; then
  echo -e "${GREEN}✓ Dashboard Analytics working${NC}"
else
  echo -e "${YELLOW}⚠ Dashboard Analytics - Unexpected response${NC}"
  echo "Response: $DASHBOARD_RESPONSE"
fi

# Step 3: Test Sales Analytics
echo "Step 3: Testing Sales Analytics..."
SALES_RESPONSE=$(curl -s -X GET "$API_URL/api/suppliers/me/analytics/sales?date_range=last_30_days" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SALES_RESPONSE" | grep -q "Invalid or expired token"; then
  echo -e "${RED}❌ Sales Analytics - Token Error${NC}"
  exit 1
elif echo "$SALES_RESPONSE" | grep -q "daily_sales"; then
  echo -e "${GREEN}✓ Sales Analytics working${NC}"
else
  echo -e "${YELLOW}⚠ Sales Analytics - Unexpected response${NC}"
fi

# Step 4: Test Products Analytics
echo "Step 4: Testing Products Analytics..."
PRODUCTS_RESPONSE=$(curl -s -X GET "$API_URL/api/suppliers/me/analytics/products?date_range=last_30_days" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PRODUCTS_RESPONSE" | grep -q "Invalid or expired token"; then
  echo -e "${RED}❌ Products Analytics - Token Error${NC}"
  exit 1
elif echo "$PRODUCTS_RESPONSE" | grep -q "top_products"; then
  echo -e "${GREEN}✓ Products Analytics working${NC}"
else
  echo -e "${YELLOW}⚠ Products Analytics - Unexpected response${NC}"
fi

# Step 5: Test Customers Analytics
echo "Step 5: Testing Customers Analytics..."
CUSTOMERS_RESPONSE=$(curl -s -X GET "$API_URL/api/suppliers/me/analytics/customers?date_range=last_30_days" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CUSTOMERS_RESPONSE" | grep -q "Invalid or expired token"; then
  echo -e "${RED}❌ Customers Analytics - Token Error${NC}"
  exit 1
elif echo "$CUSTOMERS_RESPONSE" | grep -q "acquisition_metrics"; then
  echo -e "${GREEN}✓ Customers Analytics working${NC}"
else
  echo -e "${YELLOW}⚠ Customers Analytics - Unexpected response${NC}"
fi

# Step 6: Test Financials Analytics
echo "Step 6: Testing Financials Analytics..."
FINANCIALS_RESPONSE=$(curl -s -X GET "$API_URL/api/suppliers/me/analytics/financials?date_range=last_30_days" \
  -H "Authorization: Bearer $TOKEN")

if echo "$FINANCIALS_RESPONSE" | grep -q "Invalid or expired token"; then
  echo -e "${RED}❌ Financials Analytics - Token Error${NC}"
  exit 1
elif echo "$FINANCIALS_RESPONSE" | grep -q "gross_revenue"; then
  echo -e "${GREEN}✓ Financials Analytics working${NC}"
else
  echo -e "${YELLOW}⚠ Financials Analytics - Unexpected response${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✓ All Analytics Endpoints Working!${NC}"
echo "======================================"
