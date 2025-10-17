import { describe, it, expect, vi } from "vitest";
import { vibrate } from "~/lib/navigator-api";

describe("vibrate", () => {
  it("should call navigator.vibrate when available", () => {
    const mockVibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: mockVibrate,
      writable: true,
    });

    vibrate(100);
    expect(mockVibrate).toHaveBeenCalledWith(100);
  });

  it("should call navigator.vibrate with pattern array", () => {
    const mockVibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: mockVibrate,
      writable: true,
    });

    vibrate([100, 50, 100]);
    expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it("should not throw when navigator is undefined", () => {
    const originalNavigator = global.navigator;
    delete (global as any).navigator;

    expect(() => vibrate(100)).not.toThrow();

    (global as any).navigator = originalNavigator;
  });

  it("should not throw when navigator.vibrate is undefined", () => {
    const originalVibrate = navigator.vibrate;
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      writable: true,
    });

    expect(() => vibrate(100)).not.toThrow();

    navigator.vibrate = originalVibrate;
  });
});
