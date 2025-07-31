#!/bin/bash

# Test Whoop Webhook Script
# This script sends a test webhook to your local development server

# Configuration
WEBHOOK_URL="http://localhost:3000/api/webhooks/whoop"
WEBHOOK_SECRET="your_whoop_app_secret_here"  # Replace with your actual secret

# Create test payload
PAYLOAD='{"user_id":12345,"id":"550e8400-e29b-41d4-a716-446655440000","type":"workout.updated","trace_id":"test-trace-id"}'

# Generate timestamp
TIMESTAMP=$(date +%s)000  # milliseconds

# Create signature
MESSAGE="${TIMESTAMP}${PAYLOAD}"
SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)

echo "🧪 Testing Whoop Webhook"
echo "📡 URL: $WEBHOOK_URL"
echo "⏰ Timestamp: $TIMESTAMP"
echo "🔐 Signature: ${SIGNATURE:0:20}..."
echo "📦 Payload: $PAYLOAD"
echo ""

# Send webhook
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-WHOOP-Signature: $SIGNATURE" \
  -H "X-WHOOP-Signature-Timestamp: $TIMESTAMP" \
  -d "$PAYLOAD" \
  -v

echo ""
echo "✅ Test webhook sent!"
echo "Check your server logs to see if it was processed correctly."
