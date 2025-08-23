/**
 * Cloudflare Context Handler for OpenNext
 * 
 * This module handles the proper injection of Cloudflare bindings (D1, KV)
 * into the application context when running on Cloudflare Workers via OpenNext.
 */

import { injectCloudflareBindings, type CloudflareEnv } from "./cloudflare-bindings";
import { injectDatabaseBindings } from "~/server/db";

// Global flag to track if bindings have been injected
let bindingsInjected = false;

/**
 * Inject Cloudflare bindings from the worker environment
 * This should be called early in the request lifecycle
 */
export function injectCloudflareContext(env?: any) {
  if (bindingsInjected && !shouldReinject()) {
    return;
  }

  console.log("[CloudflareContext] Attempting to inject bindings...");

  // Get environment from various sources
  const cloudflareEnv = env || getCloudflareEnvironment();
  
  if (!cloudflareEnv) {
    console.warn("[CloudflareContext] No Cloudflare environment found");
    return;
  }

  console.log("[CloudflareContext] Found Cloudflare environment with bindings:", Object.keys(cloudflareEnv));

  // Extract the bindings we need
  const bindings: Partial<CloudflareEnv> = {};
  
  if (cloudflareEnv.DB) {
    bindings.DB = cloudflareEnv.DB;
  }
  
  if (cloudflareEnv.RATE_LIMIT_KV) {
    bindings.RATE_LIMIT_KV = cloudflareEnv.RATE_LIMIT_KV;
  }
  
  if (cloudflareEnv.CACHE_KV) {
    bindings.CACHE_KV = cloudflareEnv.CACHE_KV;
  }

  // Inject bindings into global scope
  if (Object.keys(bindings).length > 0) {
    console.log("[CloudflareContext] Injecting bindings:", Object.keys(bindings));
    
    injectCloudflareBindings(bindings as CloudflareEnv);
    injectDatabaseBindings({ DB: bindings.DB });
    
    bindingsInjected = true;
    
    // Set a global marker that bindings are available
    (globalThis as any).__CLOUDFLARE_BINDINGS_INJECTED__ = true;
    
    console.log("[CloudflareContext] Successfully injected bindings");
  } else {
    console.warn("[CloudflareContext] No recognized bindings found in environment");
  }
}

/**
 * Get Cloudflare environment from various sources
 */
function getCloudflareEnvironment(): any {
  // Method 1: OpenNext Cloudflare context (most common)
  try {
    const cloudflareContext = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    if (cloudflareContext?.env) {
      console.log("[CloudflareContext] Found environment via OpenNext context");
      return cloudflareContext.env;
    }
  } catch (error) {
    // Continue to next method
  }

  // Method 2: Global env object (direct Workers)
  if ((globalThis as any).env) {
    console.log("[CloudflareContext] Found environment via global env");
    return (globalThis as any).env;
  }

  // Method 3: Already injected bindings
  const existingBindings = {
    DB: (globalThis as any).DB,
    RATE_LIMIT_KV: (globalThis as any).RATE_LIMIT_KV,
    CACHE_KV: (globalThis as any).CACHE_KV,
  };

  if (existingBindings.DB || existingBindings.RATE_LIMIT_KV || existingBindings.CACHE_KV) {
    console.log("[CloudflareContext] Found existing bindings on global scope");
    return existingBindings;
  }

  return null;
}

/**
 * Check if we should reinject bindings (e.g., in case they were cleared)
 */
function shouldReinject(): boolean {
  // Reinject if the global marker is missing or if no bindings are available
  return !(globalThis as any).__CLOUDFLARE_BINDINGS_INJECTED__ || 
         (!(globalThis as any).DB && !(globalThis as any).RATE_LIMIT_KV);
}

/**
 * Hook to ensure bindings are injected before any database operation
 * Call this in your API routes or server functions
 */
export function ensureCloudflareBindings() {
  if (!bindingsInjected || shouldReinject()) {
    injectCloudflareContext();
  }
}

/**
 * Get the current status of bindings injection
 */
export function getBindingsStatus() {
  return {
    injected: bindingsInjected,
    hasD1: !!(globalThis as any).DB,
    hasRateLimitKV: !!(globalThis as any).RATE_LIMIT_KV,
    hasCacheKV: !!(globalThis as any).CACHE_KV,
    hasContext: !!(globalThis as any)[Symbol.for("__cloudflare-context__")],
  };
}