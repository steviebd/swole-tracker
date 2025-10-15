#!/usr/bin/env bun

/**
 * Setup script for test environment variables and mocks.
 * This ensures coverage runs don't depend on live services by seeding
 * required environment variables and setting up basic mocks.
 *
 * Usage: bun run scripts/setup-tests.ts
 */

import { env } from "~/env";

// Set test environment variables to avoid dependency on live services
process.env.NODE_ENV = "test";
process.env.WORKER_SESSION_SECRET =
  "test_session_secret_32_chars_minimum_12345678901234567890123456789012";
process.env.ENCRYPTION_MASTER_KEY =
  "test_encryption_key_32_chars_minimum_12345678901234567890123456789012";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
process.env.AI_GATEWAY_PROMPT = "Tell a fitness joke";
process.env.AI_GATEWAY_MODEL = "openai/gpt-4o-mini";
process.env.AI_GATEWAY_JOKE_MEMORY_NUMBER = "3";
process.env.VERCEL_AI_GATEWAY_API_KEY = "test-key";
process.env.RATE_LIMIT_ENABLED = "false"; // Disable rate limiting for tests

// Mock database connection
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// Ensure atob and btoa are available globally
if (typeof global.atob === "undefined") {
  global.atob = (str: string) => Buffer.from(str, "base64").toString("binary");
}
if (typeof global.btoa === "undefined") {
  global.btoa = (str: string) => Buffer.from(str, "binary").toString("base64");
}

// Mock Web Crypto API
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    subtle: {
      importKey: () =>
        Promise.resolve({ type: "secret", algorithm: { name: "AES-GCM" } }),
      deriveKey: () =>
        Promise.resolve({ type: "secret", algorithm: { name: "AES-GCM" } }),
      encrypt: (algorithm: any, key: any, data: Uint8Array) => {
        const encrypted = `encrypted_${Buffer.from(data).toString("base64")}`;
        return Promise.resolve(new Uint8Array(Buffer.from(encrypted)));
      },
      decrypt: (algorithm: any, key: any, data: Uint8Array) => {
        const str = Buffer.from(data).toString();
        if (str.startsWith("encrypted_")) {
          const plaintext = str.replace("encrypted_", "");
          return Promise.resolve(
            new Uint8Array(Buffer.from(plaintext, "base64")),
          );
        }
        return Promise.resolve(data);
      },
      sign: () => Promise.resolve(new Uint8Array([1, 2, 3, 4])),
      verify: () => Promise.resolve(true),
    },
  },
  writable: true,
});

// Mock Buffer
const MockBuffer = class Buffer {
  static from(data: any, encoding?: string) {
    if (encoding === "base64") {
      return Buffer.from(data, "base64");
    }
    return new Uint8Array();
  }
  static isBuffer(obj: any) {
    return (
      obj &&
      typeof obj === "object" &&
      obj.constructor &&
      obj.constructor.name === "Uint8Array"
    );
  }
};
Object.defineProperty(global, "Buffer", { value: MockBuffer, writable: true });

// Mock localStorage
const mockLocalStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  get length() {
    return 0;
  },
};
Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

// Mock window.localStorage for browser environment
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
}

// Mock posthog
const mockPosthog = { capture: () => {}, identify: () => {}, reset: () => {} };
if (typeof window !== "undefined") {
  Object.defineProperty(window, "posthog", {
    value: mockPosthog,
    writable: true,
    configurable: true,
  });
}

console.log(
  "✅ Test environment setup complete. Environment variables and mocks seeded.",
);
