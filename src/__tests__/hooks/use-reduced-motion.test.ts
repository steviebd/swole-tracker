import { act, renderHook } from "~/__tests__/test-utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { describe, it, expect, afterEach, vi } from "vitest";

describe("useReducedMotion", () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  afterEach(() => {
    const win =
      typeof window === "undefined"
        ? (globalThis as unknown as Window & typeof globalThis)
        : window;
    if (originalMatchMedia) {
      win.matchMedia = originalMatchMedia;
    } else {
      delete (win as unknown as { matchMedia?: typeof window.matchMedia })
        .matchMedia;
    }
  });

  it("reacts to prefers-reduced-motion media query changes", () => {
    const listeners: Array<(event: MediaQueryListEvent) => void> = [];

    const win =
      typeof window === "undefined"
        ? (globalThis as unknown as Window & typeof globalThis)
        : window;
    originalMatchMedia = win.matchMedia;
    win.matchMedia = vi.fn().mockImplementation((query: string) => {
      return {
        matches: false,
        media: query,
        addEventListener: (_event: string, handler: (event: MediaQueryListEvent) => void) => {
          listeners.push(handler);
        },
        removeEventListener: vi.fn(),
        addListener: (handler: (event: MediaQueryListEvent) => void) => {
          listeners.push(handler);
        },
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);

    act(() => {
      listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    });

    expect(result.current).toBe(true);
  });
});
