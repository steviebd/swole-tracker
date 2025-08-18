import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("supabase-browser.ts complete coverage", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // vi.resetModules() was removed in vitest v3
    // Use vi.doUnmock() or manual module resets as needed
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("should export functions correctly", async () => {
    const module = await import("~/lib/supabase-browser");
    expect(typeof module.createBrowserSupabaseClient).toBe("function");
    expect(typeof module.clearSupabaseAuth).toBe("function");
  });

  it("should not execute clearSupabaseAuth when window is undefined", async () => {
    global.window = undefined as any;
    
    const { clearSupabaseAuth } = await import("~/lib/supabase-browser");
    expect(() => clearSupabaseAuth()).not.toThrow();
  });

  it("should execute clearSupabaseAuth when window is defined with localStorage items", async () => {
    // Mock browser environment with localStorage items using Object.keys approach
    const mockRemoveItem = vi.fn();
    const localStorageMock = {
      "sb-test-key": "value1",
      "supabase-data": "value2",
      "other-item": "value3",
      removeItem: mockRemoveItem,
    };

    // Mock Object.keys to return the actual keys
    const originalObjectKeys = Object.keys;
    Object.keys = vi.fn().mockImplementation((obj) => {
      if (obj === localStorageMock) {
        return ["sb-test-key", "supabase-data", "other-item"];
      }
      return originalObjectKeys(obj);
    });

    global.window = {
      localStorage: localStorageMock,
      document: {
        cookie: "sb-session=abc123; regular-cookie=def456; supabase-auth=ghi789",
      },
    } as any;

    const { clearSupabaseAuth } = await import("~/lib/supabase-browser");
    clearSupabaseAuth();

    // Should call removeItem for sb-* and supabase* keys
    expect(mockRemoveItem).toHaveBeenCalledTimes(2);
    expect(mockRemoveItem).toHaveBeenCalledWith("sb-test-key");
    expect(mockRemoveItem).toHaveBeenCalledWith("supabase-data");

    // Restore original Object.keys
    Object.keys = originalObjectKeys;
  });

  it("should execute clearSupabaseAuth when window is defined with no matching items", async () => {
    // Mock browser environment with no matching localStorage items
    const mockRemoveItem = vi.fn();
    const localStorageMock = {
      "other-item": "value",
      removeItem: mockRemoveItem,
    };

    // Mock Object.keys to return the actual keys
    const originalObjectKeys = Object.keys;
    Object.keys = vi.fn().mockImplementation((obj) => {
      if (obj === localStorageMock) {
        return ["other-item"];
      }
      return originalObjectKeys(obj);
    });

    global.window = {
      localStorage: localStorageMock,
      document: {
        cookie: "regular-cookie=def456",
      },
    } as any;

    const { clearSupabaseAuth } = await import("~/lib/supabase-browser");
    clearSupabaseAuth();

    // Should not call removeItem for non-matching keys
    expect(mockRemoveItem).not.toHaveBeenCalled();

    // Restore original Object.keys
    Object.keys = originalObjectKeys;
  });

  it("should handle empty localStorage and cookies", async () => {
    // Mock browser environment with empty storage
    const mockRemoveItem = vi.fn();
    const localStorageMock = {
      removeItem: mockRemoveItem,
    };

    // Mock Object.keys to return empty array
    const originalObjectKeys = Object.keys;
    Object.keys = vi.fn().mockImplementation((obj) => {
      if (obj === localStorageMock) {
        return [];
      }
      return originalObjectKeys(obj);
    });

    global.window = {
      localStorage: localStorageMock,
      document: {
        cookie: "",
      },
    } as any;

    const { clearSupabaseAuth } = await import("~/lib/supabase-browser");
    clearSupabaseAuth();

    // Should not throw and should not call removeItem
    expect(mockRemoveItem).not.toHaveBeenCalled();

    // Restore original Object.keys
    Object.keys = originalObjectKeys;
  });

  it("should handle malformed cookie strings", async () => {
    // Mock browser environment with malformed cookies
    const mockRemoveItem = vi.fn();
    const localStorageMock = {
      removeItem: mockRemoveItem,
    };

    // Mock Object.keys to return empty array
    const originalObjectKeys = Object.keys;
    Object.keys = vi.fn().mockImplementation((obj) => {
      if (obj === localStorageMock) {
        return [];
      }
      return originalObjectKeys(obj);
    });

    global.window = {
      localStorage: localStorageMock,
      document: {
        cookie: "=invalid; =also-invalid; valid=value",
      },
    } as any;

    const { clearSupabaseAuth } = await import("~/lib/supabase-browser");
    expect(() => clearSupabaseAuth()).not.toThrow();

    // Restore original Object.keys
    Object.keys = originalObjectKeys;
  });

  it("should create browser supabase client", async () => {
    const { createBrowserSupabaseClient } = await import("~/lib/supabase-browser");
    const client = createBrowserSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client).toBe("object");
  });

  it("should handle cookie parsing with equals signs in values", async () => {
    // Mock browser environment with complex cookies
    const mockRemoveItem = vi.fn();
    const localStorageMock = {
      removeItem: mockRemoveItem,
    };

    // Mock Object.keys to return empty array
    const originalObjectKeys = Object.keys;
    Object.keys = vi.fn().mockImplementation((obj) => {
      if (obj === localStorageMock) {
        return [];
      }
      return originalObjectKeys(obj);
    });

    global.window = {
      localStorage: localStorageMock,
      document: {
        cookie: "sb-session=abc=123; regular-cookie=def456; supabase-auth=ghi=789",
      },
    } as any;

    const { clearSupabaseAuth } = await import("~/lib/supabase-browser");
    expect(() => clearSupabaseAuth()).not.toThrow();

    // Restore original Object.keys
    Object.keys = originalObjectKeys;
  });
});