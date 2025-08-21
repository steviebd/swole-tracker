import { describe, it, expect, beforeEach } from "vitest";
import {
  injectCloudflareBindings,
  getD1Binding,
  getKVBinding,
} from "~/lib/cloudflare-bindings";
import type { CloudflareEnv } from "~/lib/cloudflare-bindings";

describe("Cloudflare bindings utilities", () => {
  beforeEach(() => {
    // Clean up global state before each test
    delete (globalThis as any).DB;
    delete (globalThis as any).RATE_LIMIT_KV;
    delete (globalThis as any).CACHE_KV;
    delete (globalThis as any).CloudflareEnv;
  });

  describe("injectCloudflareBindings function", () => {
    it("should inject D1 database binding to globalThis", () => {
      const mockDB = {} as D1Database;
      const mockRateLimitKV = {} as KVNamespace;
      const mockCacheKV = {} as KVNamespace;

      const env: CloudflareEnv = {
        DB: mockDB,
        RATE_LIMIT_KV: mockRateLimitKV,
        CACHE_KV: mockCacheKV,
      };

      injectCloudflareBindings(env);

      expect((globalThis as any).DB).toBe(mockDB);
      expect((globalThis as any).RATE_LIMIT_KV).toBe(mockRateLimitKV);
      expect((globalThis as any).CACHE_KV).toBe(mockCacheKV);
      expect((globalThis as any).CloudflareEnv).toBe(env);
    });

    it("should handle function call without throwing", () => {
      const env: CloudflareEnv = {
        DB: {} as D1Database,
        RATE_LIMIT_KV: {} as KVNamespace,
        CACHE_KV: {} as KVNamespace,
      };

      expect(() => injectCloudflareBindings(env)).not.toThrow();
    });
  });

  describe("getD1Binding function", () => {
    it("should return null when no binding is available", () => {
      const result = getD1Binding();
      expect(result).toBeNull();
    });

    it("should return D1 binding from globalThis.DB", () => {
      const mockDB = {} as D1Database;
      (globalThis as any).DB = mockDB;

      const result = getD1Binding();
      expect(result).toBe(mockDB);
    });

    it("should return D1 binding from CloudflareEnv.DB", () => {
      const mockDB = {} as D1Database;
      (globalThis as any).CloudflareEnv = { DB: mockDB };

      const result = getD1Binding();
      expect(result).toBe(mockDB);
    });

    it("should prioritize globalThis.DB over CloudflareEnv.DB", () => {
      const mockDB1 = {} as D1Database;
      const mockDB2 = {} as D1Database;
      (globalThis as any).DB = mockDB1;
      (globalThis as any).CloudflareEnv = { DB: mockDB2 };

      const result = getD1Binding();
      expect(result).toBe(mockDB1);
    });
  });

  describe("getKVBinding function", () => {
    it("should return null when no binding is available", () => {
      const result = getKVBinding("RATE_LIMIT_KV");
      expect(result).toBeNull();
    });

    it("should return RATE_LIMIT_KV binding from globalThis", () => {
      const mockKV = {} as KVNamespace;
      (globalThis as any).RATE_LIMIT_KV = mockKV;

      const result = getKVBinding("RATE_LIMIT_KV");
      expect(result).toBe(mockKV);
    });

    it("should return CACHE_KV binding from globalThis", () => {
      const mockKV = {} as KVNamespace;
      (globalThis as any).CACHE_KV = mockKV;

      const result = getKVBinding("CACHE_KV");
      expect(result).toBe(mockKV);
    });

    it("should return KV binding from CloudflareEnv", () => {
      const mockKV = {} as KVNamespace;
      (globalThis as any).CloudflareEnv = { RATE_LIMIT_KV: mockKV };

      const result = getKVBinding("RATE_LIMIT_KV");
      expect(result).toBe(mockKV);
    });

    it("should prioritize globalThis binding over CloudflareEnv", () => {
      const mockKV1 = {} as KVNamespace;
      const mockKV2 = {} as KVNamespace;
      (globalThis as any).RATE_LIMIT_KV = mockKV1;
      (globalThis as any).CloudflareEnv = { RATE_LIMIT_KV: mockKV2 };

      const result = getKVBinding("RATE_LIMIT_KV");
      expect(result).toBe(mockKV1);
    });

    it("should handle both binding types", () => {
      const mockRateLimitKV = {} as KVNamespace;
      const mockCacheKV = {} as KVNamespace;
      (globalThis as any).RATE_LIMIT_KV = mockRateLimitKV;
      (globalThis as any).CACHE_KV = mockCacheKV;

      expect(getKVBinding("RATE_LIMIT_KV")).toBe(mockRateLimitKV);
      expect(getKVBinding("CACHE_KV")).toBe(mockCacheKV);
    });
  });

  describe("Type definitions", () => {
    it("should have proper CloudflareEnv interface", () => {
      // Test that the interface is properly defined
      const env: CloudflareEnv = {
        DB: {} as D1Database,
        RATE_LIMIT_KV: {} as KVNamespace,
        CACHE_KV: {} as KVNamespace,
      };

      expect(env.DB).toBeDefined();
      expect(env.RATE_LIMIT_KV).toBeDefined();
      expect(env.CACHE_KV).toBeDefined();
    });
  });
});
