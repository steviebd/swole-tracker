/**
 * Cloudflare Runtime Bindings
 * 
 * This utility handles the injection of Cloudflare D1 and KV bindings
 * at runtime for Pages Functions and Workers.
 */

// Type definitions for Cloudflare bindings
export interface CloudflareEnv {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  CACHE_KV: KVNamespace;
}

// Make bindings available globally for the database connection
export function injectCloudflareBindings(env: CloudflareEnv) {
  // Inject D1 database binding
  (globalThis as any).DB = env.DB;
  
  // Inject KV namespace bindings
  (globalThis as any).RATE_LIMIT_KV = env.RATE_LIMIT_KV;
  (globalThis as any).CACHE_KV = env.CACHE_KV;
  
  // Also make them available via CloudflareEnv object
  (globalThis as any).CloudflareEnv = env;
}

// Get D1 database binding
export function getD1Binding(): D1Database | null {
  if (typeof globalThis !== "undefined" && (globalThis as any).DB) {
    return (globalThis as any).DB as D1Database;
  }
  
  if (typeof globalThis !== "undefined" && (globalThis as any).CloudflareEnv?.DB) {
    return (globalThis as any).CloudflareEnv.DB as D1Database;
  }
  
  return null;
}

// Get KV namespace binding
export function getKVBinding(binding: 'RATE_LIMIT_KV' | 'CACHE_KV'): KVNamespace | null {
  if (typeof globalThis !== "undefined" && (globalThis as any)[binding]) {
    return (globalThis as any)[binding] as KVNamespace;
  }
  
  if (typeof globalThis !== "undefined" && (globalThis as any).CloudflareEnv?.[binding]) {
    return (globalThis as any).CloudflareEnv[binding] as KVNamespace;
  }
  
  return null;
}