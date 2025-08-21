export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

interface RateLimitRecord {
  requests: number;
  windowStart: number;
  createdAt: number;
}

// Type for Cloudflare KV binding
type KVNamespace = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (options?: { prefix?: string }) => Promise<{ keys: Array<{ name: string }> }>;
};

// Function to get KV namespace binding
function getRateLimitKV(): KVNamespace {
  // In Cloudflare Workers environment, KV is available via env.RATE_LIMIT_KV
  if (typeof process !== "undefined" && process.env) {
    // For local development, check if we have access to Cloudflare bindings
    if ((globalThis as any).RATE_LIMIT_KV) {
      return (globalThis as any).RATE_LIMIT_KV as KVNamespace;
    }
    
    // Fallback for local development - mock KV interface
    // In practice, wrangler dev will provide the KV binding
    console.warn("RATE_LIMIT_KV binding not found, using development fallback");
    return {
      get: async () => null,
      put: async () => Promise.resolve(),
      delete: async () => Promise.resolve(),
      list: async () => ({ keys: [] }),
    };
  }
  
  throw new Error("RATE_LIMIT_KV binding not available");
}

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  limit: number,
  windowMs: number = 60 * 60 * 1000, // 1 hour in milliseconds
): Promise<RateLimitResult> {
  const kv = getRateLimitKV();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetTime = new Date(windowStart + windowMs);
  
  // Create KV key for this user/endpoint/window combination
  const key = `rate_limit:${userId}:${endpoint}:${windowStart}`;

  try {
    // Get existing rate limit record
    const existingData = await kv.get(key);
    let record: RateLimitRecord;

    if (!existingData) {
      // Create new rate limit record
      record = {
        requests: 1,
        windowStart,
        createdAt: now,
      };
      
      // Store with TTL to auto-expire after the window
      const ttlSeconds = Math.ceil(windowMs / 1000) + 60; // Add 60s buffer
      await kv.put(key, JSON.stringify(record), { expirationTtl: ttlSeconds });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime,
      };
    }

    record = JSON.parse(existingData);

    // Check if limit exceeded
    if (record.requests >= limit) {
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    // Increment request count
    record.requests += 1;
    
    // Update the record with new count
    const ttlSeconds = Math.ceil((resetTime.getTime() - now) / 1000) + 60; // Add 60s buffer
    await kv.put(key, JSON.stringify(record), { expirationTtl: ttlSeconds });

    return {
      allowed: true,
      remaining: limit - record.requests,
      resetTime,
    };
  } catch (error) {
    console.error('Rate limit KV error:', error);
    
    // In case of KV errors, allow the request but log the error
    // This prevents rate limiting from blocking the entire app
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
    };
  }
}

export async function cleanupExpiredRateLimits(): Promise<void> {
  // KV entries auto-expire with TTL, so this is no longer needed
  // Keep the function for compatibility but make it a no-op
  console.log('KV rate limits auto-expire, cleanup not needed');
}

/**
 * Get current rate limit status for a user/endpoint without incrementing
 */
export async function getRateLimitStatus(
  userId: string,
  endpoint: string,
  limit: number,
  windowMs: number = 60 * 60 * 1000,
): Promise<RateLimitResult> {
  const kv = getRateLimitKV();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetTime = new Date(windowStart + windowMs);
  
  const key = `rate_limit:${userId}:${endpoint}:${windowStart}`;

  try {
    const existingData = await kv.get(key);
    
    if (!existingData) {
      return {
        allowed: true,
        remaining: limit,
        resetTime,
      };
    }

    const record: RateLimitRecord = JSON.parse(existingData);
    const remaining = Math.max(0, limit - record.requests);
    const allowed = record.requests < limit;
    const retryAfter = allowed ? undefined : Math.ceil((resetTime.getTime() - now) / 1000);

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter,
    };
  } catch (error) {
    console.error('Rate limit status KV error:', error);
    
    return {
      allowed: true,
      remaining: limit,
      resetTime,
    };
  }
}
