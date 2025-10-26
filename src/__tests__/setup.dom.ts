/// <reference types="vitest" />
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import "~/styles/globals.css";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { workosAuthHandlers } from "./mocks/workos-auth";

const server = setupServer(...workosAuthHandlers);

const ensureLocalStorage = () => {
  if (typeof window === "undefined") return;

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
  if (typeof window === "undefined") return;

  if ("matchMedia" in window) return;

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
  if (typeof window === "undefined") return;

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
  if (typeof window === "undefined") return;

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
  if (typeof window === "undefined") return;

  // Define Element to avoid motion-dom errors
  if (typeof globalThis.Element === "undefined") {
    (globalThis as any).Element = class Element {};
  }
};

beforeAll(() => {
  console.log("setup.dom.ts running");
  // Ensure document.body is properly set up for jsdom
  if (typeof document !== "undefined") {
    if (!document.body || typeof document.body.appendChild !== "function") {
      document.body = document.createElement("body");
    }
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
