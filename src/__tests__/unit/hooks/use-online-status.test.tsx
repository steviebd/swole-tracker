import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '~/hooks/use-online-status';

describe('useOnlineStatus', () => {
  const listeners = new Map<string, Set<(e: Event) => void>>();

  function dispatch(type: string) {
    const set = listeners.get(type);
    if (set) {
      set.forEach((fn) => fn(new Event(type)));
    }
  }

  beforeEach(() => {
    vi.useFakeTimers();
    // stub add/removeEventListener on window
    listeners.clear();
    vi.spyOn(window, 'addEventListener').mockImplementation((type: any, cb: any) => {
      const set = listeners.get(type) ?? new Set();
      set.add(cb);
      listeners.set(type, set);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type: any, cb: any) => {
      const set = listeners.get(type);
      if (set) set.delete(cb);
    });
    // default navigator.onLine = true (jsdom already truthy but ensure)
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    listeners.clear();
  });

  it('initialises to navigator.onLine and updates on online/offline events', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // go offline
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    act(() => {
      dispatch('offline');
    });
    expect(result.current).toBe(false);

    // back online
    Object.defineProperty(window.navigator, 'onLine', { value: true });
    act(() => {
      dispatch('online');
    });
    expect(result.current).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOnlineStatus());
    expect(listeners.get('online')?.size ?? 0).toBe(1);
    expect(listeners.get('offline')?.size ?? 0).toBe(1);

    unmount();

    expect(listeners.get('online')?.size ?? 0).toBe(0);
    expect(listeners.get('offline')?.size ?? 0).toBe(0);
  });
});
