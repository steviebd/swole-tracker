import { beforeAll } from "vitest";

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
process.env.AI_GATEWAY_JOKE_MEMORY_NUMBER ??= "3";
process.env.VERCEL_AI_GATEWAY_API_KEY ??= "test-key";

const ensureDomEnvironment = async () => {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return;
  }

  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    pretendToBeVisual: true,
  });

  const { window: jsdomWindow } = dom;

  globalThis.window = jsdomWindow as unknown as Window & typeof globalThis;
  globalThis.document = jsdomWindow.document;
  globalThis.navigator = jsdomWindow.navigator;
  globalThis.self = jsdomWindow as unknown as typeof globalThis;
  globalThis.HTMLElement =
    jsdomWindow.HTMLElement as typeof globalThis.HTMLElement;
  globalThis.CustomEvent =
    jsdomWindow.CustomEvent as typeof globalThis.CustomEvent;
  globalThis.getComputedStyle = jsdomWindow.getComputedStyle.bind(
    jsdomWindow,
  );
  globalThis.Event = jsdomWindow.Event as typeof globalThis.Event;
  globalThis.Node = jsdomWindow.Node as typeof globalThis.Node;

  // Some libraries access window.location.{...} setters; cloning ensures they exist.
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    enumerable: true,
    get() {
      return jsdomWindow.location;
    },
    set(value: URL | string) {
      jsdomWindow.location.href = value.toString();
    },
  });

  // Provide no-op implementations for APIs not implemented by JSDOM
  jsdomWindow.scrollTo ??= () => {};
  jsdomWindow.requestAnimationFrame ??= (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 0) as unknown as number;
  jsdomWindow.cancelAnimationFrame ??= (handle: number) =>
    clearTimeout(handle as unknown as NodeJS.Timeout);
  globalThis.requestAnimationFrame =
    jsdomWindow.requestAnimationFrame.bind(jsdomWindow);
  globalThis.cancelAnimationFrame =
    jsdomWindow.cancelAnimationFrame.bind(jsdomWindow);
};

await ensureDomEnvironment();

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
  globalThis.crypto = webcrypto as unknown as Crypto;
}

ensureBase64Helpers();

await import("./setup.dom");

export {};
