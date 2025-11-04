/// <reference types="vitest" />
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import "~/styles/globals.css";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { workosAuthHandlers } from "./mocks/workos-auth";

const server = setupServer(...workosAuthHandlers);

const ensureLocalStorage = () => {
  // Ensure window is defined first
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  const storageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => {}),
    removeItem: vi.fn(() => {}),
    clear: vi.fn(() => {}),
    key: vi.fn(() => null),
    get length() {
      return 0;
    },
  };

  Object.defineProperty(window, "localStorage", {
    value: storageMock,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "localStorage", {
    value: storageMock,
    writable: true,
    configurable: true,
  });

  // Ensure crypto.randomUUID is available
  if (
    typeof globalThis.crypto !== "undefined" &&
    !globalThis.crypto.randomUUID
  ) {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: () => "test-uuid-123",
      writable: true,
      configurable: true,
    });
  }
};

const ensureMatchMedia = () => {
  // Ensure window is defined first
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  if (typeof window.matchMedia === "function") return;

  Object.defineProperty(window, "matchMedia", {
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true,
    configurable: true,
  });
};

const ensurePosthog = () => {
  // Ensure window is defined first
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  Object.defineProperty(window, "posthog", {
    value: {
      capture: vi.fn(),
      identify: vi.fn(),
      reset: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
};

const ensureImage = () => {
  // Ensure window is defined first
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  // Mock Image constructor for drag operations
  globalThis.Image = vi.fn().mockImplementation(() => ({
    src: "",
    onload: null,
    onerror: null,
    width: 0,
    height: 0,
  })) as any;
};

const ensureFramerMotion = () => {
  // Ensure window is defined first
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  // Define Element to avoid motion-dom errors
  if (typeof globalThis.Element === "undefined") {
    (globalThis as any).Element = class Element {};
  }
};

beforeAll(() => {
  console.log("setup.dom.ts running");

  // Ensure document is defined for jsdom environment
  if (typeof document === "undefined") {
    // Basic document mock for jsdom environment
    (global as any).document = {
      createElement: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };
  }

  // Ensure window is defined
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  // Ensure document.body is properly set up for jsdom
  if (!document.body || typeof document.body.appendChild !== "function") {
    document.body = document.createElement("body");
  }

  ensureLocalStorage();
  ensureMatchMedia();
  ensurePosthog();
  ensureImage();
  ensureFramerMotion();

  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

export {};
