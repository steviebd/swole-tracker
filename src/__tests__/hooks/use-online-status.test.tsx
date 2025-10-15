import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useOnlineStatus } from "~/hooks/use-online-status";

describe("useOnlineStatus", () => {
  it("should return initial optimistic true value", () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  it("should update to navigator.onLine after hydration", () => {
    // Mock navigator.onLine as false
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    // After effect, should update to false
    expect(result.current).toBe(false);
  });

  // it("should add and remove event listeners", () => {
  //   const { unmount } = renderHook(() => useOnlineStatus());

  //   expect(addEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
  //   expect(addEventListenerSpy).toHaveBeenCalledWith("offline", expect.any(Function));

  //   unmount();

  //   expect(removeEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
  //   expect(removeEventListenerSpy).toHaveBeenCalledWith("offline", expect.any(Function));
  // });

  it("should update status on online event", () => {
    // Start offline
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);

    // Simulate online event
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });

  it("should update status on offline event", () => {
    // Start online
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // Simulate offline event
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });
});
