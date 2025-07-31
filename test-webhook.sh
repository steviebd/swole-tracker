#!/bin/bash

# Test Whoop Webhook Script
# This script sends a test webhook to your local development server

# Configuration
WEBHOOK_URL="http://localhost:3000/api/webhooks/whoop"

# Check if environment variable is set
if [ -z "$WHOOP_WEBHOOK_SECRET" ]; then
    echo "❌ Error: WHOOP_WEBHOOK_SECRET environment variable not set"
    echo "Run: set -a && source .env && set +a && ./test-webhook.sh"
    exit 1
fi

WEBHOOK_SECRET="$WHOOP_WEBHOOK_SECRET"

# Create test payload with obvious test markers
TIMESTAMP_ID=$(date +%s)
PAYLOAD="{\"user_id\":12345,\"id\":\"test-workout-${TIMESTAMP_ID}\",\"type\":\"workout.updated\",\"trace_id\":\"test-trace-${TIMESTAMP_ID}\"}"

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
