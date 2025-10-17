import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("useReducedMotion", () => {
let matchMediaMock: any;

beforeEach(() => {
  // Mock window.matchMedia
    matchMediaMock = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when prefers-reduced-motion is not set", () => {
    const mockMediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };

    matchMediaMock.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion is set", () => {
    const mockMediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };

    matchMediaMock.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it("reacts to prefers-reduced-motion media query changes", () => {
    const mockMediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };

    let changeCallback: (event: MediaQueryListEvent) => void;
    mockMediaQuery.addEventListener.mockImplementation((event: string, callback: any) => {
      if (event === 'change') {
        changeCallback = callback;
      }
    });

    matchMediaMock.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      changeCallback({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);

    // Simulate another change
    act(() => {
      changeCallback({ matches: false } as MediaQueryListEvent);
    });

    expect(result.current).toBe(false);
  });

  it("uses fallback addListener for older browsers", () => {
    const mockMediaQuery = {
      matches: false,
      addEventListener: undefined, // Simulate older browser
      removeEventListener: undefined,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };

    let changeCallback: (event: MediaQueryListEvent) => void;
    mockMediaQuery.addListener.mockImplementation((callback: any) => {
      changeCallback = callback;
    });

    matchMediaMock.mockReturnValue(mockMediaQuery);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      changeCallback({ matches: true } as MediaQueryListEvent);
    });

    expect(result.current).toBe(true);
  });
});
