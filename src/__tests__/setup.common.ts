import { beforeAll, afterEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

// Setup DOM environment manually if needed
if (typeof globalThis.document === "undefined") {
  console.log("Setting up DOM environment manually");
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost:3000",
  });
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.navigator = dom.window.navigator;
  globalThis.location = dom.window.location;

  // Add cleanup to prevent multiple DOM instances
  (globalThis as any).__jsdomCleanup = dom;
}

// Ensure NODE_ENV defaults to test so runtime guards behave as expected
if (!process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = "test";
}

process.env["WORKER_SESSION_SECRET"] ??=
  "test_session_secret_32_chars_minimum_12345678901234567890123456789012";
process.env["ENCRYPTION_MASTER_KEY"] ??=
  "test_encryption_key_32_chars_minimum_12345678901234567890123456789012";
process.env["NEXT_PUBLIC_SITE_URL"] ??= "http://localhost:3000";
process.env["NEXT_PUBLIC_POSTHOG_KEY"] ??= "phc_test_dummy";
process.env["NEXT_PUBLIC_POSTHOG_HOST"] ??= "https://us.i.posthog.com";
process.env["AI_GATEWAY_PROMPT"] ??= "Tell a fitness joke";
process.env["AI_GATEWAY_MODEL"] ??= "openai/gpt-4o-mini";
process.env["AI_GATEWAY_MODEL_HEALTH"] ??= "xai/grok-3-mini";
process.env["AI_DEBRIEF_TEMPERATURE"] ??= "0.7";
process.env["AI_GATEWAY_JOKE_MEMORY_NUMBER"] ??= "3";
process.env["VERCEL_AI_GATEWAY_API_KEY"] ??= "test-key";

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

beforeAll(async () => {
  console.log("=== SETUP.COMMON RUNNING ===");
  console.log("typeof document:", typeof document);

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

  // Mock window.matchMedia for components that use media queries
  if (typeof window !== "undefined" && !window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      value: (query: string) => ({
        matches: false, // Always return false to simulate desktop view
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
      writable: true,
      configurable: true,
    });
  }
});

// Add global cleanup for test file isolation
afterEach(() => {
  // Clear all mocks first
  vi.clearAllMocks();

  // More thorough DOM cleanup
  if (typeof document !== "undefined") {
    // Clear body completely - remove all child nodes
    if (document.body) {
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }

    // Clear head completely except for critical test styles
    if (document.head) {
      const allElements = document.head.querySelectorAll("*");
      allElements.forEach((element) => {
        if (!element.getAttribute("data-test-override")) {
          element.remove();
        }
      });
    }
  }

  // Cleanup React Testing Library after DOM cleanup
  cleanup();

  // Re-apply essential mocks that were cleared
  if (typeof window !== "undefined") {
    // Re-apply matchMedia mock if it was cleared
    Object.defineProperty(window, "matchMedia", {
      value: (query: string) => ({
        matches: false, // Always return false to simulate desktop view
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
      writable: true,
      configurable: true,
    });

    // Reset event listeners
    Object.defineProperty(window, "addEventListener", {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });

    // Reset localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      },
      writable: true,
      configurable: true,
    });

    // Reset sessionStorage
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      },
      writable: true,
      configurable: true,
    });
  }
});

export {};
