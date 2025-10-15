import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

(globalThis as any).vi = vi;
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

beforeAll(() => {
  ensureLocalStorage();
  ensureMatchMedia();
  ensurePosthog();

  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

export {};
