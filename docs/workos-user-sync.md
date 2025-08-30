# WorkOS User Profile Synchronization

This document describes the user profile synchronization system between WorkOS and the Convex database.

## Overview

The system ensures that user profile data is automatically synchronized between WorkOS (authentication provider) and the Convex database whenever users are created or updated in WorkOS.

## Components

### 1. Convex Schema Updates

**File:** `convex/schema.ts`

Added optional `firstName` and `lastName` fields to the users table:

```typescript
users: defineTable({
  name: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()), // For WorkOS webhook sync
  lastName: v.optional(v.string()), // For WorkOS webhook sync
  workosId: v.string(), // From WorkOS identity.subject
})
```

### 2. Convex Internal Mutation

**File:** `convex/users.ts`

Added the `users.ensure` internal mutation:

```typescript
export const ensure = internalMutation({
  args: {
    workosId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validates input, creates or updates user record
    // Returns user ID for successful operations
  },
});
```

**Features:**
- ✅ Input validation (required fields, trimmed strings)
- ✅ Idempotent operations (safe to run multiple times)
- ✅ Smart display name construction (firstName + lastName → email fallback)
- ✅ Efficient updates (only patches when data changes)
- ✅ Comprehensive error handling with ConvexError

### 3. WorkOS Webhook Handler

**File:** `src/app/api/webhooks/workos/route.ts`

REST API endpoint that receives WorkOS webhook events:

**Endpoint:** `POST /api/webhooks/workos`

**Security Features:**
- ✅ HMAC-SHA256 signature verification using `WORKOS_WEBHOOK_SECRET`
- ✅ Timing-safe signature comparison to prevent timing attacks
- ✅ Rate limiting (100 requests/minute per IP)
- ✅ Comprehensive input validation
- ✅ Secure error handling (no information leakage)

**Supported Events:**
- `user.created` - Creates new user record in Convex
- `user.updated` - Updates existing user profile data

**Security Implementation:**
```typescript
function verifyWorkOSSignature(payload: string, signature: string, secret: string): boolean {
  // HMAC-SHA256 signature verification with timing-safe comparison
  // Format: t=timestamp,v1=signature
}
```

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# WorkOS webhook secret for signature verification
WORKOS_WEBHOOK_SECRET=your_workos_webhook_secret
```

### WorkOS Dashboard Setup

1. Navigate to WorkOS Dashboard → Webhooks
2. Create new webhook endpoint:
   - **URL:** `https://yourdomain.com/api/webhooks/workos`
   - **Events:** `user.created`, `user.updated`
   - **Secret:** Generate and copy to `WORKOS_WEBHOOK_SECRET`

## Testing

### Unit Tests

**Files:**
- `src/__tests__/webhooks/workos-webhook.test.ts` - Webhook signature verification
- `src/__tests__/convex/users-ensure.test.ts` - Convex mutation logic

**Coverage:**
- ✅ Signature verification (valid/invalid/malformed)
- ✅ Payload validation
- ✅ Event processing logic
- ✅ Edge cases (empty fields, optional data)
- ✅ Display name construction
- ✅ Update detection logic

### Manual Testing

**Webhook Health Check:**
```bash
curl https://yourdomain.com/api/webhooks/workos
```

**Expected Response:**
```json
{
  "service": "WorkOS webhook handler",
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "endpoints": ["user.created", "user.updated"]
}
```

## Security Considerations

### Implemented Protections

1. **Signature Verification**
   - HMAC-SHA256 with timing-safe comparison
   - Prevents payload tampering and replay attacks

2. **Rate Limiting**
   - Per-IP rate limiting (100 req/min)
   - Prevents webhook flooding attacks

3. **Input Validation**
   - Required field validation
   - Email format validation
   - Sanitized error messages

4. **Access Control**
   - Internal mutations prevent direct client access
   - Webhook-only access pattern

### Security Best Practices

- ✅ Never expose webhook secret in client-side code
- ✅ Use HTTPS for webhook endpoints in production
- ✅ Monitor webhook failure rates and retry patterns
- ✅ Rotate webhook secrets periodically
- ✅ Log security events for audit trails

## Error Handling

### Webhook Handler

**400 Bad Request:** Invalid payload, missing signature, malformed data
**401 Unauthorized:** Invalid signature verification
**429 Too Many Requests:** Rate limit exceeded
**500 Internal Server Error:** Database sync failures (triggers WorkOS retry)

### Convex Mutation

**ConvexError Messages:**
- "WorkOS ID is required" - Empty or whitespace workosId
- "Email is required" - Empty or whitespace email
- Database-level errors propagate to webhook handler

## Operational Considerations

### Monitoring

Monitor these metrics:
- Webhook success/failure rates
- Signature verification failures
- Rate limiting incidents
- Database sync errors

### Debugging

**Webhook Events:** Check WorkOS Dashboard → Webhooks → Event History
**Convex Logs:** Use `bun convex logs` to see mutation execution
**Application Logs:** Check server logs for webhook processing details

## Migration Notes

### Existing Users

Existing users in the system may not have `firstName` and `lastName` fields populated. These will be automatically updated when:
1. User profile changes in WorkOS trigger `user.updated` webhook
2. User logs in again (existing `getOrCreateUser` still works)

### Rollback Plan

If issues arise:
1. Disable webhook in WorkOS Dashboard
2. Revert Convex schema changes (optional fields won't break existing code)
3. Remove webhook handler endpoint

## Future Enhancements

Potential improvements:
- **Webhook Event Logging:** Store events in `webhookEvents` table for audit
- **Profile Picture Sync:** Add avatar URL field and sync logic  
- **Batch Operations:** Handle bulk user updates efficiently
- **Webhook Replay:** Implement mechanism to replay failed webhook events
- **Real-time Updates:** Push user profile changes to connected clients

## Dependencies

- **@workos-inc/authkit-nextjs:** WorkOS authentication integration
- **convex:** Real-time database with authentication
- **crypto:** Node.js built-in for HMAC signature verification
- **next:** App Router for webhook endpoint handling