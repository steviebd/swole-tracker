# Whoop Webhook Testing Guide

## 🚀 Quick Start

1. **Add webhook secret to `.env`:**
   ```bash
   WHOOP_WEBHOOK_SECRET=your_whoop_app_secret_here
   ```

2. **Start dev server:**
   ```bash
   pnpm dev
   ```

3. **Test the webhook:**
   ```bash
   curl -X POST "http://localhost:3000/api/webhooks/whoop/test" \
     -H "Content-Type: application/json" \
     -d '{"userId": 12345, "workoutId": "test-workout-uuid"}'
   ```

4. **Check server logs** for webhook processing details

## 🧪 Testing Options

### Option 1: Manual API Test (Easiest)
```bash
# Use the built-in test endpoint
curl -X POST "http://localhost:3000/api/webhooks/whoop/test" \
  -H "Content-Type: application/json" \
  -d '{"userId": 12345, "workoutId": "test-workout-uuid"}'
```

### Option 2: Direct cURL Test
```bash
# Run the test script
./test-webhook.sh

# Or manually with cURL (replace SECRET with your actual secret):
PAYLOAD='{"user_id":12345,"id":"550e8400-e29b-41d4-a716-446655440000","type":"workout.updated","trace_id":"test-trace-id"}'
TIMESTAMP=$(date +%s)000
SIGNATURE=$(echo -n "${TIMESTAMP}${PAYLOAD}" | openssl dgst -sha256 -hmac "YOUR_SECRET" -binary | base64)

curl -X POST "http://localhost:3000/api/webhooks/whoop" \
  -H "Content-Type: application/json" \
  -H "X-WHOOP-Signature: $SIGNATURE" \
  -H "X-WHOOP-Signature-Timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

### Option 3: Real Whoop Webhooks with ngrok

1. **Install ngrok**: `brew install ngrok` (or download from ngrok.com)

2. **Start your dev server**: `pnpm dev`

3. **Expose with ngrok**: 
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Update Whoop Developer Dashboard**:
   - Go to [developer.whoop.com](https://developer.whoop.com)
   - Navigate to your app settings
   - Set webhook URL to: `https://abc123.ngrok.io/api/webhooks/whoop`
   - Select "v2" model version
   - Save configuration

6. **Trigger a real workout** in your Whoop app or wait for Whoop to process existing workouts

7. **Watch the logs** in your terminal for incoming webhooks

## 🔍 What to Look For

### Successful Test Logs:
```
🧪 Sending test webhook: { url: '...', payload: {...}, timestamp: '...', signature: '...' }
Received Whoop webhook: { user_id: 12345, id: '...', type: 'workout.updated', trace_id: '...' }
Processing workout update webhook: { ... }
Could not fetch workout data for test-workout-uuid (expected for test)
```

### Error Logs to Watch For:
- ❌ `Invalid webhook signature` - Check your WHOOP_WEBHOOK_SECRET
- ❌ `Missing required webhook headers` - Headers not set correctly
- ❌ `Webhook timestamp outside acceptable range` - Clock sync issue
- ❌ `No active Whoop integration found` - User not connected to Whoop

## 🐛 Debugging Tips

1. **Check Environment Variables**:
   ```bash
   echo $WHOOP_WEBHOOK_SECRET  # Should not be empty
   ```

2. **Verify Database Connection**: Check if workouts table exists and is accessible

3. **Test Signature Generation**: Use the test endpoint to verify signature logic

4. **Monitor Server Logs**: Watch both Next.js console and any deployed service logs

5. **Check Whoop Dashboard**: Verify webhook URL is correctly configured

## ✅ Expected Behavior

### For Test Webhooks:
- ✅ Webhook receives and validates signature
- ✅ Processes the workout.updated event
- ⚠️ Fails to fetch workout data (expected - fake workout ID)
- ✅ Returns success response from test endpoint

### For Real Webhooks:
- ✅ Webhook receives and validates signature  
- ✅ Fetches actual workout data from Whoop API
- ✅ Updates/inserts workout in database
- ✅ Workout appears in database and UI without manual sync

## 🔧 Troubleshooting

### "Invalid signature" error:
- Ensure `WHOOP_WEBHOOK_SECRET` matches your Whoop app secret
- Check that timestamp is being included in signature calculation

### "No integration found" error:
- User needs to connect their Whoop account first
- Check that user_id mapping is correct

### No webhook received:
- Verify ngrok tunnel is active
- Check Whoop dashboard webhook configuration
- Ensure webhook URL uses HTTPS
