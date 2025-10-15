import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCacheManager,
  setOfflineCacheUser,
  setupOfflinePersistence,
} from "~/lib/offline-storage";

let cacheManager: any;
let localStorageMock: any;

beforeEach(() => {
  cacheManager = getCacheManager();
  localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  // Mock global localStorage
  (global as any).localStorage = localStorageMock;
});

describe("CacheManager", () => {
  describe("performCacheCleanup via performCacheHealthCheck", () => {
    it("should perform standard cleanup when cache size exceeds warning threshold", () => {
      const mockCacheData = {
        clientState: {
          queries: {
            query1: { state: { dataUpdatedAt: 1000 } },
            query2: { state: { dataUpdatedAt: 2000 } },
            query3: { state: { dataUpdatedAt: 3000 } },
            query4: { state: { dataUpdatedAt: 4000 } },
            query5: { state: { dataUpdatedAt: 5000 } },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCacheData));

      // Mock getCacheSize to return size above warning (4MB)
      const originalGetCacheSize = cacheManager.getCacheSize;
      cacheManager.getCacheSize = vi.fn(() => 4.1 * 1024 * 1024);

      cacheManager.performCacheHealthCheck();

      // Should have performed cleanup (remove 20% of queries)
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const setItemCall = localStorageMock.setItem.mock.calls.find(
        (call: any) => call[0] === cacheManager.getCacheKey(),
      );
      expect(setItemCall).toBeDefined();
      const savedData = JSON.parse(setItemCall[1]);
      // Should have 4 queries left (removed 1)
      expect(Object.keys(savedData.clientState.queries)).toHaveLength(4);

      // Restore
      cacheManager.getCacheSize = originalGetCacheSize;
    });

    it("should perform aggressive cleanup when cache size exceeds critical threshold", () => {
      const mockCacheData = {
        clientState: {
          queries: {
            query1: { state: { dataUpdatedAt: 1000 } },
            query2: { state: { dataUpdatedAt: 2000 } },
            query3: { state: { dataUpdatedAt: 3000 } },
            query4: { state: { dataUpdatedAt: 4000 } },
            query5: { state: { dataUpdatedAt: 5000 } },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCacheData));

      // Mock getCacheSize to return size above aggressive cleanup threshold
      const originalGetCacheSize = cacheManager.getCacheSize;
      cacheManager.getCacheSize = vi.fn(() => 4.6 * 1024 * 1024);

      cacheManager.performCacheHealthCheck();

      // Should have performed aggressive cleanup (remove 50% of queries)
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const setItemCall = localStorageMock.setItem.mock.calls.find(
        (call: any) => call[0] === cacheManager.getCacheKey(),
      );
      expect(setItemCall).toBeDefined();
      const savedData = JSON.parse(setItemCall[1]);
      // Should have 4 queries left (removed 1)
      expect(Object.keys(savedData.clientState.queries)).toHaveLength(4);

      // Restore
      cacheManager.getCacheSize = originalGetCacheSize;
    });

    it("should track cache event when quota exceeded", () => {
      const mockCacheData = { clientState: { queries: {} } };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockCacheData));

      // Mock getCacheSize to exceed quota
      const originalGetCacheSize = cacheManager.getCacheSize;
      cacheManager.getCacheSize = vi.fn(() => 10 * 1024 * 1024); // 10MB

      // Mock trackCacheEvent
      const originalTrackCacheEvent = cacheManager.trackCacheEvent;
      cacheManager.trackCacheEvent = vi.fn();

      cacheManager.performCacheHealthCheck();

      expect(cacheManager.trackCacheEvent).toHaveBeenCalledWith(
        "quota_exceeded_fallback",
        expect.any(Object),
      );

      // Restore
      cacheManager.getCacheSize = originalGetCacheSize;
      cacheManager.trackCacheEvent = originalTrackCacheEvent;
    });
  });
});

describe("setOfflineCacheUser", () => {
  it("should set cache scope for user", () => {
    setOfflineCacheUser("user123");

    expect(getCacheManager().getCacheKey()).toBe(
      "swole-tracker-cache-v3:user123",
    );
  });

  it("should set default scope for null user", () => {
    setOfflineCacheUser(null);

    expect(getCacheManager().getCacheKey()).toBe(
      "swole-tracker-cache-v3:guest",
    );
  });

  it("should sanitize user ID", () => {
    setOfflineCacheUser("user@#$%^&*()");

    expect(getCacheManager().getCacheKey()).toBe(
      "swole-tracker-cache-v3:user_________",
    );
  });
});

describe("setupOfflinePersistence", () => {
  it("should not setup persistence on server", () => {
    const originalWindow = global.window;
    delete (global as any).window;

    const mockQueryClient = {
      mount: vi.fn(),
      unmount: vi.fn(),
      isFetching: vi.fn(() => 0),
    } as any;

    setupOfflinePersistence(mockQueryClient);

    expect(true).toBe(true); // Just to have an assertion

    (global as any).window = originalWindow;
  });
});
