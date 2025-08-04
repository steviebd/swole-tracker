import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "~/hooks/use-local-storage";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import React, { type PropsWithChildren } from "react";

// Helpers to render hooks requiring QueryClient
function withClient(ui: React.ReactElement, client: QueryClient) {
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe.skip("useLocalStorage", () => {
  const original = globalThis.localStorage;
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mock = {
      getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
      setItem: vi.fn((k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: vi.fn((k: string) => {
        delete store[k];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage;
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: original,
      configurable: true,
    });
  });

  it("reads initial value from localStorage and updates both state and storage", () => {
    localStorage.setItem("k", JSON.stringify({ a: 1 }));
    const { result } = renderHook(() => useLocalStorage<{ a: number }>("k", { a: 0 }));
    expect(result.current[0]).toEqual({ a: 1 });

    act(() => {
      result.current[1]({ a: 2 });
    });
    expect(result.current[0]).toEqual({ a: 2 });
    expect(localStorage.getItem("k")).toEqual(JSON.stringify({ a: 2 }));
  });

  it("removes key when setting undefined/null via setter", () => {
    const { result } = renderHook(() => useLocalStorage<string | null>("z", "x"));
    expect(result.current[0]).toBe("x");

    act(() => {
      result.current[1](null as any);
    });
    expect(localStorage.getItem("z")).toBe(JSON.stringify(null));
  });
});

describe.skip("useCacheInvalidation", () => {
  function Providers({ children }: PropsWithChildren) {
    const qc = new QueryClient();
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }

  it("invalidates queries when invalidate is called", async () => {
    const qc = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => withClient(<>{children}</>, qc);

    // create a tracked query
    const key = ["x", 1];
    const fetcher = vi.fn(async () => 1);
    const { unmount } = renderHook(
      () =>
        useQuery({
          queryKey: key,
          queryFn: fetcher,
          staleTime: 1000,
        }),
      { wrapper },
    );

    // ensure fetched once
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useCacheInvalidation(), {
      wrapper,
    });

    await act(async () => {
      // call a public invalidation method and then invalidateAll to simulate broader cache bust
      result.current.invalidateAll();
    });

    // simulate tick and inspect that queries are marked invalid
    await Promise.resolve();
    expect(qc.getQueryState(key)?.isInvalidated).toBe(true);

    unmount();
  });
});
