import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as storageModule from '~/lib/offline-storage';

// If offline-queue uses offline-storage under the hood, we can spy on it.
// Adjust to real API after first run if needed.

describe('offline-storage (cache persistence utilities)', () => {
  const CACHE_KEY = 'swole-tracker-cache';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('clearOfflineCache removes the persisted cache key in browser environment', async () => {
    // Simulate browser localStorage
    const store: Record<string, string> = {};
    const originalLocalStorage = globalThis.localStorage;
    // @ts-ignore - overriding in test environment
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: 0,
    } as unknown as Storage;

    // seed cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({ foo: 'bar' }));

    storageModule.clearOfflineCache();

    expect(localStorage.getItem(CACHE_KEY)).toBeNull();

    // restore
    // @ts-ignore - restoring test override
    globalThis.localStorage = originalLocalStorage;
  });

  it('getCacheSize reports human readable sizes', () => {
    const originalLocalStorage = globalThis.localStorage;
    const store: Record<string, string> = {};
    // @ts-ignore - overriding in test environment
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: 0,
    } as unknown as Storage;

    // No cache
    expect(storageModule.getCacheSize()).toBe('0 KB');

    // Small cache (bytes)
    localStorage.setItem(CACHE_KEY, 'a'); // 1 byte
    const small = storageModule.getCacheSize();
    expect(small.endsWith('B') || small.endsWith('KB') || small.endsWith('MB')).toBe(true);

    // Larger cache (KB)
    localStorage.setItem(CACHE_KEY, 'a'.repeat(2048)); // 2 KB
    const kb = storageModule.getCacheSize();
    expect(kb.includes('KB') || kb.includes('MB')).toBe(true);

    // restore
    // @ts-ignore - restoring test override
    globalThis.localStorage = originalLocalStorage;
  });

  it('setupOfflinePersistence is a no-op on SSR', () => {
    const { setupOfflinePersistence } = storageModule;
    // Simulate SSR by removing window
    const originalWindow = (globalThis as any).window;
    // @ts-ignore - simulating SSR by removing window
    delete (globalThis as any).window;
    // minimal QueryClient shape (we only test the guard)
    const qc = {} as any;
    expect(() => setupOfflinePersistence(qc)).not.toThrow();
    // restore window
    (globalThis as any).window = originalWindow;
  });
});
