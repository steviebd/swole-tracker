import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

describe("offline-storage: setupOfflinePersistence and helpers", () => {
  const CACHE_KEY = "swole-tracker-cache";
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    vi.resetModules();
    // create a fake browser env
    (globalThis as any).window = {};
    const store: Record<string, string> = {};
    // @ts-ignore - overriding in test environment
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: 0,
    } as unknown as Storage;
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    // @ts-ignore
    globalThis.localStorage = originalLocalStorage;
    vi.clearAllMocks();
  });

  it("setupOfflinePersistence calls persistQueryClient with expected options in browser", async () => {
    // Hoisted safe mocks must not reference local variables; use importMock/Actual pattern
    vi.mock("@tanstack/react-query-persist-client", () => ({
      persistQueryClient: vi.fn().mockResolvedValue(undefined),
    }));
    vi.mock("@tanstack/query-sync-storage-persister", async () => {
      // re-export the actual module from within the mock factory
      return await vi.importActual<any>(
        "@tanstack/query-sync-storage-persister",
      );
    });

    const mod = await import("~/lib/offline-storage");
    const { setupOfflinePersistence } = mod;

    // minimal QueryClient shape for call signature
    const queryClient = {} as any;
    setupOfflinePersistence(queryClient);

    const mocked = await vi.importMock<any>(
      "@tanstack/react-query-persist-client",
    );
    const persistSpy = mocked.persistQueryClient as unknown as ReturnType<
      typeof vi.fn
    >;
    expect(persistSpy).toHaveBeenCalledTimes(1);
    const arg = persistSpy.mock.calls[0]?.[0]!;
    expect(arg.queryClient).toBe(queryClient);
    expect(arg.maxAge).toBe(1000 * 60 * 60 * 24 * 7);
    expect(arg.buster).toBe("swole-tracker-v1");
    expect(typeof arg.persister).toBe("object");
    // Ensure dehydrateOptions.shouldDehydrateQuery only persists success
    const fakeQuery = { state: { status: "success" } };
    expect(arg.dehydrateOptions.shouldDehydrateQuery(fakeQuery)).toBe(true);
    const loading = { state: { status: "loading" } };
    expect(arg.dehydrateOptions.shouldDehydrateQuery(loading)).toBe(false);
  });

  it("clearOfflineCache removes key and getCacheSize reflects empty size", async () => {
    const mod = await import("~/lib/offline-storage");
    const { clearOfflineCache, getCacheSize } = mod;

    localStorage.setItem(CACHE_KEY, "abc");
    expect(getCacheSize()).not.toBe("0 KB");

    clearOfflineCache();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(getCacheSize()).toBe("0 KB");
  });
});
