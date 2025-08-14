import { describe, it, expect, vi } from "vitest";

describe("supabase-browser.ts simple complete coverage", () => {
  it("should export functions correctly", async () => {
    const module = await import("~/lib/supabase-browser");
    expect(typeof module.createBrowserSupabaseClient).toBe("function");
    expect(typeof module.clearSupabaseAuth).toBe("function");
  });

  it("should not throw when calling clearSupabaseAuth in server environment", async () => {
    // Save original window
    const originalWindow = global.window;
    
    // Simulate server environment
    global.window = undefined as any;
    
    const { clearSupabaseAuth } = await import("~/lib/supabase-browser");
    expect(() => clearSupabaseAuth()).not.toThrow();
    
    // Restore original window
    global.window = originalWindow;
  });

  it("should not throw when calling clearSupabaseAuth in browser environment", async () => {
    // Save originals
    const originalWindow = global.window;
    const originalLocalStorage = global.localStorage;
    const originalDocument = global.document;
    
    // Mock browser environment
    const mockLocalStorage = {
      "sb-test-key": "value1",
      "supabase-data": "value2",
      "other-item": "value3",
      removeItem: vi.fn(),
    };
    
    global.window = {
      localStorage: mockLocalStorage,
      document: {
        cookie: "sb-session=abc123; regular-cookie=def456",
      },
    } as any;
    
    global.localStorage = mockLocalStorage as any;
    global.document = global.window.document;
    
    const { clearSupabaseAuth } = await import("~/lib/supabase-browser");
    expect(() => clearSupabaseAuth()).not.toThrow();
    
    // Restore originals
    global.window = originalWindow;
    global.localStorage = originalLocalStorage;
    global.document = originalDocument;
  });

  it("should create browser supabase client", async () => {
    const { createBrowserSupabaseClient } = await import("~/lib/supabase-browser");
    const client = createBrowserSupabaseClient();
    expect(client).toBeDefined();
    expect(typeof client).toBe("object");
  });
});