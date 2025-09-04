import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "~/hooks/use-local-storage";

// localStorage is mocked in setup.ts
const mockLocalStorage = (globalThis as any).window.localStorage;

describe("useLocalStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return initial value when no stored value exists", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "initial-value"),
    );

    expect(result.current[0]).toBe("initial-value");
    expect(result.current[2]).toBe(true); // isLoaded should be true after mount
  });

  it("should load stored value from localStorage", () => {
    const storedValue = { name: "John", age: 30 };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedValue));

    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default-value"),
    );

    expect(result.current[0]).toEqual(storedValue);
    expect(result.current[2]).toBe(true);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("test-key");
  });

  it("should handle invalid JSON in localStorage", () => {
    mockLocalStorage.getItem.mockReturnValue("invalid json");

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default-value"),
    );

    expect(result.current[0]).toBe("default-value");
    expect(result.current[2]).toBe(true);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("test-key");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid JSON for test-key"),
      "invalid json",
    );

    consoleSpy.mockRestore();
  });

  it("should save value to localStorage when setValue is called", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "test-key",
      JSON.stringify("new-value"),
    );
  });

  it("should handle function updater", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "test-key",
      JSON.stringify(1),
    );
  });

  it("should handle complex objects", () => {
    const initialValue = { items: [] as string[], count: 0 };
    const newValue = { items: ["item1"], count: 1 };

    const { result } = renderHook(() =>
      useLocalStorage("test-key", initialValue),
    );

    act(() => {
      result.current[1](newValue);
    });

    expect(result.current[0]).toEqual(newValue);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "test-key",
      JSON.stringify(newValue),
    );
  });

  it("should handle localStorage errors gracefully", () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error("localStorage error");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage("test-key", "default"));

    expect(result.current[0]).toBe("default");
    expect(result.current[2]).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error accessing localStorage for test-key"),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("should handle setItem errors gracefully", () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error("Quota exceeded");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("new-value");
    });

    // Value should still be updated in state even if localStorage fails
    expect(result.current[0]).toBe("new-value");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error saving test-key"),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("should work with different data types", () => {
    // String
    const { result: stringResult } = renderHook(() =>
      useLocalStorage("string-key", "default"),
    );
    expect(stringResult.current[0]).toBe("default");

    // Number
    const { result: numberResult } = renderHook(() =>
      useLocalStorage("number-key", 42),
    );
    expect(numberResult.current[0]).toBe(42);

    // Boolean
    const { result: booleanResult } = renderHook(() =>
      useLocalStorage("boolean-key", true),
    );
    expect(booleanResult.current[0]).toBe(true);

    // Array
    const { result: arrayResult } = renderHook(() =>
      useLocalStorage("array-key", [1, 2, 3]),
    );
    expect(arrayResult.current[0]).toEqual([1, 2, 3]);

    // Null
    const { result: nullResult } = renderHook(() =>
      useLocalStorage("null-key", null),
    );
    expect(nullResult.current[0]).toBe(null);
  });

  it("should handle rapid updates", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", 0));

    act(() => {
      result.current[1](1);
      result.current[1](2);
      result.current[1](3);
    });

    expect(result.current[0]).toBe(3);
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3);
  });

  it("should update when key changes", () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === "key1") return JSON.stringify("value1");
      if (key === "key2") return JSON.stringify("value2");
      return null;
    });

    const { result, rerender } = renderHook(
      ({ key }) => useLocalStorage(key, "default"),
      { initialProps: { key: "key1" } },
    );

    expect(result.current[0]).toBe("value1");

    rerender({ key: "key2" });

    expect(result.current[0]).toBe("value2");
  });

  it("should handle rapid updates", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", 0));

    act(() => {
      result.current[1](1);
      result.current[1](2);
      result.current[1](3);
    });

    expect(result.current[0]).toBe(3);
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3);
  });
});
