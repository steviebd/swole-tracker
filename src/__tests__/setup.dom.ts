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

const ensureResizeObserver = () => {
  // Ensure window is defined first
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  // Mock ResizeObserver for recharts and other components
  globalThis.ResizeObserver = vi.fn().mockImplementation((callback) => {
    // Immediately call callback with mock entry to avoid async issues
    setTimeout(() => {
      const entry = {
        target: document.createElement("div"),
        contentRect: { width: 800, height: 400 },
        borderBoxSize: [{ inlineSize: 800, blockSize: 400 }],
      };
      callback([entry]);
    }, 0);

    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  });

  // Mock IntersectionObserver for virtual components and Next.js use-intersection
  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit | undefined;
    _targets: Element[] = [];

    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      this.callback = callback;
      this.options = options;

      // Immediately call callback with mock entries to simulate intersection
      setTimeout(() => {
        const entry = {
          target: document.createElement("div"),
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: { top: 0, left: 0, width: 100, height: 100 },
          intersectionRect: { top: 0, left: 0, width: 100, height: 100 },
          rootBounds: { top: 0, left: 0, width: 800, height: 600 },
          time: Date.now(),
        } as any;
        this.callback([entry], this as any);
      }, 0);
    }

    observe = vi.fn((target: Element) => {
      this._targets.push(target);
    });

    unobserve = vi.fn((target: Element) => {
      const index = this._targets.indexOf(target);
      if (index > -1) {
        this._targets.splice(index, 1);
      }
    });

    disconnect = vi.fn(() => {
      this._targets = [];
    });

    takeRecords = vi.fn(() => []);

    get root() {
      return this.options?.root || null;
    }

    get rootMargin() {
      return this.options?.rootMargin || "";
    }

    get thresholds() {
      return Array.isArray(this.options?.threshold)
        ? this.options.threshold
        : this.options?.threshold
          ? [this.options.threshold]
          : [];
    }
  }

  globalThis.IntersectionObserver = MockIntersectionObserver as any;

  // Also ensure it's available on window object for Next.js
  if (typeof window !== "undefined") {
    (window as any).IntersectionObserver = MockIntersectionObserver;
  }
};

beforeAll(() => {
  console.log("setup.dom.ts running");
  console.log("Environment:", process.env.NODE_ENV);
  console.log(
    "Test environment:",
    typeof document !== "undefined" ? "DOM available" : "No DOM",
  );

  // Ensure window is defined (jsdom should provide this)
  if (typeof window === "undefined") {
    (global as any).window = {};
  }

  // Only create document mock if absolutely no document exists
  // (shouldn't happen with jsdom environment)
  if (typeof document === "undefined") {
    console.log(
      "Document is undefined, creating minimal mock for tests to run",
    );

    const createMockElement = (tagName: string) => {
      const element = {
        tagName: tagName.toUpperCase(),
        style: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
        hasAttribute: vi.fn(),
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(),
          toggle: vi.fn(),
        },
        parentNode: null,
        parentElement: null,
        nodeName: tagName.toUpperCase(),
        nodeType: 1,
        nodeValue: null,
        textContent: "",
        innerHTML: "",
        outerHTML: "",
        children: [],
        childNodes: [],
        firstChild: null,
        lastChild: null,
        nextSibling: null,
        previousSibling: null,
        getBoundingClientRect: vi.fn(() => ({
          top: 0,
          left: 0,
          width: 100,
          height: 100,
          right: 100,
          bottom: 100,
        })),
        focus: vi.fn(),
        blur: vi.fn(),
        click: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: vi.fn(() => false),
        closest: vi.fn(() => null),
        querySelector: vi.fn(() => null),
        querySelectorAll: vi.fn(() => []),
        getElementsByTagName: vi.fn(() => []),
        getElementsByClassName: vi.fn(() => []),
        getElementById: vi.fn(() => null),
      };

      // Make it look like a DOM element for React
      Object.defineProperty(element, "ownerDocument", {
        value: globalThis.document,
      });
      return element;
    };

    const mockDocument = {
      createElement: createMockElement,
      createElementNS: vi.fn((namespace: string, tagName: string) =>
        createMockElement(tagName),
      ),
      createTextNode: vi.fn((text: string) => ({
        nodeType: 3,
        nodeValue: text,
        textContent: text,
        nodeName: "#text",
        parentNode: null,
        parentElement: null,
      })),
      body: createMockElement("body"),
      documentElement: createMockElement("html"),
      head: createMockElement("head"),
      activeElement: null,
      readyState: "complete",
      visibilityState: "visible",
      defaultView: globalThis.window || {},
      implementation: {
        createHTMLDocument: vi.fn(() => mockDocument),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      getElementById: vi.fn(() => null),
      getElementsByClassName: vi.fn(() => []),
      getElementsByTagName: vi.fn(() => []),
      createEvent: vi.fn(() => ({
        initEvent: vi.fn(),
        type: "",
        bubbles: false,
        cancelable: false,
      })),
      createDocumentFragment: vi.fn(() => ({
        nodeType: 11,
        nodeName: "#document-fragment",
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        childNodes: [],
      })),
    };

    (global as any).document = mockDocument;

    // Set up circular references
    Object.defineProperty(mockDocument.body, "ownerDocument", {
      value: mockDocument,
    });
    Object.defineProperty(mockDocument.documentElement, "ownerDocument", {
      value: mockDocument,
    });
    Object.defineProperty(mockDocument.head, "ownerDocument", {
      value: mockDocument,
    });
  }

  ensureLocalStorage();
  ensureMatchMedia();
  ensurePosthog();
  ensureImage();
  ensureFramerMotion();
  ensureResizeObserver();

  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

export {};
