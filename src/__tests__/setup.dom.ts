/// <reference types="vitest" />
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

console.log("=== SETUP.DOM FILE LOADING ===");

// Initialize MSW server once (eagerly to avoid race conditions)
// import { setupServer } from "msw/node";
// import { workosAuthHandlers } from "./mocks/workos-auth";

// const server = setupServer(...workosAuthHandlers);
const server = {
  listen: () => {},
  resetHandlers: () => {},
  close: () => {},
};

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

const ensureResizeObserver = () => {
  // Ensure window is defined first
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  // Mock ResizeObserver for recharts and other components
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });

  // Mock IntersectionObserver for virtual components and Next.js use-intersection
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = "";
    thresholds = [];
  }

  globalThis.IntersectionObserver = MockIntersectionObserver as any;

  // Also ensure it's available on window object for Next.js
  if (typeof window !== "undefined") {
    (window as any).IntersectionObserver = MockIntersectionObserver;
  }
};

beforeAll(() => {
  console.log("=== DOM SETUP START ===");
  console.log("typeof document:", typeof document);
  console.log("typeof window:", typeof window);

  // Fix for JSDOM hardwareConcurrency infinite recursion
  if (typeof window !== "undefined" && window.navigator) {
    Object.defineProperty(window.navigator, "hardwareConcurrency", {
      value: 4,
      writable: true,
      configurable: true,
    });
  }

  // Only run setup if DOM is available
  if (typeof document !== "undefined") {
    console.log("DOM environment check:");
    console.log("window exists:", typeof window !== "undefined");
    console.log("document exists:", typeof document !== "undefined");
    console.log("document constructor:", document?.constructor?.name);

    ensureLocalStorage();
    ensureMatchMedia();
    ensurePosthog();
    ensureImage();
    ensureFramerMotion();
    ensureResizeObserver();
  } else {
    console.log("DOM not available in setup, skipping DOM-specific setup");
  }

  server.listen();
  console.log("=== DOM SETUP END ===");
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());

export {};
