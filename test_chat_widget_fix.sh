#!/bin/bash
set -e

echo "=== Testing Chat Widget Fix ==="

API_URL="http://localhost:3000"

# 1. Login as customer
echo "1. Logging in as customer..."
CUSTOMER_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"john.contractor@example.com","password":"password123"}' | jq -r '.token')

echo "Customer token: ${CUSTOMER_TOKEN:0:20}..."

# 2. Create a conversation
echo "2. Creating customer-supplier conversation..."
CONV_RESPONSE=$(curl -s -X POST "$API_URL/api/chat/conversations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{"conversation_type":"customer_supplier"}')

CONVERSATION_ID=$(echo "$CONV_RESPONSE" | jq -r '.conversation_id')
echo "Conversation ID: $CONVERSATION_ID"

# 3. Send a message from customer
echo "3. Sending message from customer..."
curl -s -X POST "$API_URL/api/chat/conversations/$CONVERSATION_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d '{"message_text":"Hello, I need help with lumber products"}' | jq .

# 4. Login as supplier
echo "4. Logging in as supplier..."
SUPPLIER_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"supplier@acme-supply.com","password":"password123"}' | jq -r '.token')

echo "Supplier token: ${SUPPLIER_TOKEN:0:20}..."

# 5. Get supplier conversations
echo "5. Fetching supplier conversations..."
SUPPLIER_CONVS=$(curl -s -X GET "$API_URL/api/chat/conversations?conversation_type=customer_supplier" \
  -H "Authorization: Bearer $SUPPLIER_TOKEN")

echo "Supplier conversations:"
echo "$SUPPLIER_CONVS" | jq '.[0] | {conversation_id, customer_id, supplier_id, conversation_type}'

# 6. Send message from supplier to the conversation
echo "6. Sending message from supplier..."
curl -s -X POST "$API_URL/api/chat/conversations/$CONVERSATION_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPPLIER_TOKEN" \
  -d '{"message_text":"Hello! I can help you with lumber. What specific products do you need?"}' | jq .

# 7. Fetch messages from customer perspective
echo "7. Fetching messages as customer..."
MESSAGES=$(curl -s -X GET "$API_URL/api/chat/conversations/$CONVERSATION_ID/messages?limit=50&offset=0" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN")

echo "Messages in conversation:"
echo "$MESSAGES" | jq '.[] | {sender_type, message_text, timestamp}'

MESSAGE_COUNT=$(echo "$MESSAGES" | jq 'length')
echo ""
echo "=== TEST SUMMARY ==="
echo "Total messages: $MESSAGE_COUNT"

if [ "$MESSAGE_COUNT" -ge 2 ]; then
  echo "✓ TEST PASSED: Chat conversation working correctly"
  echo "✓ Both customer and supplier messages are present"
else
  echo "✗ TEST FAILED: Expected at least 2 messages, got $MESSAGE_COUNT"
  exit 1
fi
