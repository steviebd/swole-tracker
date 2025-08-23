/**
 * Cloudflare Runtime Bindings
 * 
 * This utility handles the injection of Cloudflare D1 and KV bindings
 * at runtime for Pages Functions and Workers, with special handling for OpenNext.
 */

// Type definitions for Cloudflare bindings
export interface CloudflareEnv {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  CACHE_KV: KVNamespace;
}

// Cache for bindings to avoid repeated lookups
let bindingsCache: { env?: any; timestamp?: number } | null = null;
const CACHE_TTL = 1000; // 1 second cache to avoid excessive lookups

// Get the current Cloudflare environment from all possible sources
function getCloudflareEnv(): any {
  const now = Date.now();
  
  // Return cached result if still valid
  if (bindingsCache?.timestamp && (now - bindingsCache.timestamp) < CACHE_TTL) {
    return bindingsCache.env;
  }
  
  let env: any = null;
  
  // Method 1: Check OpenNext Cloudflare context (primary for OpenNext deployments)
  try {
    const cloudflareContext = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    if (cloudflareContext?.env) {
      env = cloudflareContext.env;
      console.log("[CloudflareBindings] Found bindings via OpenNext context", Object.keys(env || {}));
    }
  } catch (error) {
    // Context not available, continue to other methods
  }
  
  // Method 2: Check global env object (direct Cloudflare Workers)
  if (!env && typeof globalThis !== 'undefined' && (globalThis as any).env) {
    env = (globalThis as any).env;
    console.log("[CloudflareBindings] Found bindings via global env", Object.keys(env || {}));
  }
  
  // Method 3: Check injected CloudflareEnv
  if (!env && typeof globalThis !== 'undefined' && (globalThis as any).CloudflareEnv) {
    env = (globalThis as any).CloudflareEnv;
    console.log("[CloudflareBindings] Found bindings via injected CloudflareEnv", Object.keys(env || {}));
  }
  
  // Method 4: Check individual bindings on global scope
  if (!env && typeof globalThis !== 'undefined') {
    const individualBindings = {
      DB: (globalThis as any).DB,
      RATE_LIMIT_KV: (globalThis as any).RATE_LIMIT_KV,
      CACHE_KV: (globalThis as any).CACHE_KV
    };
    
    if (individualBindings.DB || individualBindings.RATE_LIMIT_KV || individualBindings.CACHE_KV) {
      env = individualBindings;
      console.log("[CloudflareBindings] Found bindings via individual globals", Object.keys(env || {}).filter(k => env?.[k]));
    }
  }
  
  // Update cache
  bindingsCache = { env, timestamp: now };
  
  return env;
}

// Make bindings available globally for the database connection
export function injectCloudflareBindings(env: CloudflareEnv) {
  console.log("[CloudflareBindings] Injecting bindings", Object.keys(env));
  
  // Inject D1 database binding
  (globalThis as any).DB = env.DB;
  
  // Inject KV namespace bindings
  (globalThis as any).RATE_LIMIT_KV = env.RATE_LIMIT_KV;
  (globalThis as any).CACHE_KV = env.CACHE_KV;
  
  // Also make them available via CloudflareEnv object
  (globalThis as any).CloudflareEnv = env;
  
  // Clear cache to force refresh
  bindingsCache = null;
}

// Get D1 database binding
export function getD1Binding(): D1Database | null {
  const env = getCloudflareEnv();
  
  if (env?.DB) {
    console.log("[CloudflareBindings] Found D1 binding");
    return env.DB as D1Database;
  }
  
  console.log("[CloudflareBindings] D1 binding not found (normal during build time)");
  return null;
}

// Get KV namespace binding
export function getKVBinding(binding: 'RATE_LIMIT_KV' | 'CACHE_KV'): KVNamespace | null {
  const env = getCloudflareEnv();
  
  if (env?.[binding]) {
    console.log(`[CloudflareBindings] Found ${binding} binding`);
    return env[binding] as KVNamespace;
  }
  
  console.log(`[CloudflareBindings] ${binding} binding not found (normal during build time)`);
  return null;
}