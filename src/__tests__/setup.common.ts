import { beforeAll } from "vitest";

console.log("setup.common.ts running");

// Ensure NODE_ENV defaults to test so runtime guards behave as expected
if (!process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = "test";
}

process.env.WORKER_SESSION_SECRET ??=
  "test_session_secret_32_chars_minimum_12345678901234567890123456789012";
process.env.ENCRYPTION_MASTER_KEY ??=
  "test_encryption_key_32_chars_minimum_12345678901234567890123456789012";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_POSTHOG_KEY ??= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ??= "https://us.i.posthog.com";
process.env.AI_GATEWAY_PROMPT ??= "Tell a fitness joke";
process.env.AI_GATEWAY_MODEL ??= "openai/gpt-4o-mini";
process.env.AI_GATEWAY_MODEL_HEALTH ??= "xai/grok-3-mini";
process.env.AI_DEBRIEF_TEMPERATURE ??= "0.7";
process.env.AI_GATEWAY_JOKE_MEMORY_NUMBER ??= "3";
process.env.VERCEL_AI_GATEWAY_API_KEY ??= "test-key";

const ensureDomEnvironment = () => {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return;
  }

  (globalThis as any).window = {
    location: {
      href: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    },
    scrollTo: () => {},
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 0),
    cancelAnimationFrame: (handle: number) =>
      clearTimeout(handle as unknown as NodeJS.Timeout),
  };

  (globalThis as any).document = {
    documentElement: {
      dataset: {},
    },
  };

  (globalThis as any).navigator = {};
  (globalThis as any).self = globalThis;
  (globalThis as any).HTMLElement = class {};
  (globalThis as any).CustomEvent = class {};
  (globalThis as any).Event = class {};
  (globalThis as any).Node = class {};
};

ensureDomEnvironment();

const ensureBase64Helpers = () => {
  if (typeof globalThis.atob !== "function") {
    globalThis.atob = (data: string) =>
      Buffer.from(data, "base64").toString("binary");
  }

  if (typeof globalThis.btoa !== "function") {
    globalThis.btoa = (data: string) =>
      Buffer.from(data, "binary").toString("base64");
  }
};

beforeAll(() => {
  // Additional setup if needed
});

if (typeof globalThis.crypto === "undefined") {
  const { webcrypto } = await import("node:crypto");
  globalThis.crypto = {
    ...webcrypto,
    randomUUID: () => "test-uuid-123",
  } as unknown as Crypto;
}

ensureBase64Helpers();

// Mock crypto.randomUUID globally
if (globalThis.crypto && !globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: () => "test-uuid-12345",
    writable: true,
    configurable: true,
  });
}

await import("./setup.dom");

export {};
