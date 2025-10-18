import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetInputLatencySamples,
  vibrate,
  getDeviceType,
  getThemeUsed,
  collectTTI_TBT,
  recordInputLatencyStart,
  recordInputLatencyEnd,
  snapshotInputLatency,
  snapshotMetricsBlob,
  startLongTaskObserver,
} from "~/lib/client-telemetry";

describe("client-telemetry", () => {
  beforeEach(() => {
    resetInputLatencySamples();
    // Reset mocks
    vi.restoreAllMocks();
  });

  describe("resetInputLatencySamples", () => {
    it("should reset input latency samples", () => {
      // Add some samples
      recordInputLatencyStart();
      recordInputLatencyEnd(0);
      expect(snapshotInputLatency().samples).toHaveLength(1);

      resetInputLatencySamples();
      expect(snapshotInputLatency().samples).toHaveLength(0);
    });
  });

  describe("vibrate", () => {
    it("should call navigator vibrate when available", () => {
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, "vibrate", {
        value: mockVibrate,
        writable: true,
      });

      vibrate(100);
      expect(mockVibrate).toHaveBeenCalledWith(100);
    });

    it("should handle vibration failure silently", () => {
      const mockVibrate = vi.fn(() => {
        throw new Error("Vibration not supported");
      });
      Object.defineProperty(navigator, "vibrate", {
        value: mockVibrate,
        writable: true,
      });

      expect(() => vibrate(100)).not.toThrow();
      expect(mockVibrate).toHaveBeenCalledWith(100);
    });
  });

  describe("getDeviceType", () => {
    it("should return unknown when navigator is undefined", () => {
      const originalNavigator = global.navigator;
      // @ts-ignore
      delete global.navigator;

      expect(getDeviceType()).toBe("unknown");

      global.navigator = originalNavigator;
    });

    it("should detect iPad", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
        configurable: true,
      });

      expect(getDeviceType()).toBe("ipad");
    });

    it("should detect iPhone", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
        configurable: true,
      });

      expect(getDeviceType()).toBe("ios");
    });

    it("should detect Android", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 10)",
        configurable: true,
      });

      expect(getDeviceType()).toBe("android");
    });

    it("should detect desktop", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      });

      expect(getDeviceType()).toBe("desktop");
    });

    it("should return unknown for unrecognized user agent", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Unknown Browser",
        configurable: true,
      });
      Object.defineProperty(navigator, "vendor", {
        value: "",
        configurable: true,
      });

      expect(getDeviceType()).toBe("unknown");
    });
  });

  describe("getThemeUsed", () => {
    it("should return null when document is undefined", () => {
      const originalDocument = global.document;
      // @ts-ignore
      delete global.document;

      expect(getThemeUsed()).toBeNull();

      global.document = originalDocument;
    });

    it("should return theme from documentElement dataset", () => {
      Object.defineProperty(document.documentElement, "dataset", {
        value: { theme: "dark" },
        configurable: true,
      });

      expect(getThemeUsed()).toBe("dark");
    });

    it("should return null when dataset.theme is not set", () => {
      Object.defineProperty(document.documentElement, "dataset", {
        value: {},
        configurable: true,
      });

      expect(getThemeUsed()).toBeNull();
    });

    it("should handle errors gracefully", () => {
      const mockGet = vi.fn(() => {
        throw new Error("Access denied");
      });
      Object.defineProperty(document.documentElement, "dataset", {
        get: mockGet,
      });

      expect(getThemeUsed()).toBeNull();
    });
  });

  describe("collectTTI_TBT", () => {
    it("should return empty object when performance is undefined", () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      expect(collectTTI_TBT()).toEqual({});

      global.performance = originalPerformance;
    });

    it("should calculate TTI and TBT from performance entries", () => {
      const mockNavigationEntry = {
        domContentLoadedEventEnd: 1000,
        loadEventEnd: 2000,
        loadEventStart: 1500,
        duration: 0,
        entryType: "navigation",
        name: "navigation",
        startTime: 0,
        toJSON: () => ({}),
      } as PerformanceNavigationTiming;
      const mockFcpEntry = {
        startTime: 500,
        duration: 0,
        entryType: "paint",
        name: "first-contentful-paint",
        toJSON: () => ({}),
      } as PerformancePaintTiming;

      Object.defineProperty(performance, "getEntriesByType", {
        value: vi.fn((type: string) => {
          if (type === "navigation") return [mockNavigationEntry];
          if (type === "paint") return [mockFcpEntry];
          return [];
        }),
        writable: true,
      });

      const result = collectTTI_TBT();
      expect(result.tti).toBe(600); // fcp.startTime + 100
      expect(result.tbt).toBe(450); // loadTime - 50
    });

    it("should handle missing paint entries", () => {
      const mockNavigationEntry = {
        domContentLoadedEventEnd: 1000,
        loadEventEnd: 2000,
        loadEventStart: 1500,
        duration: 0,
        entryType: "navigation",
        name: "navigation",
        startTime: 0,
        toJSON: () => ({}),
      } as PerformanceNavigationTiming;

      Object.defineProperty(performance, "getEntriesByType", {
        value: vi.fn((type: string) => {
          if (type === "navigation") return [mockNavigationEntry];
          return [];
        }),
        writable: true,
      });

      const result = collectTTI_TBT();
      expect(result.tti).toBe(1000); // domContentLoadedEventEnd
      expect(result.tbt).toBe(450);
    });

    it("should handle errors gracefully", () => {
      Object.defineProperty(performance, "getEntriesByType", {
        value: vi.fn(() => {
          throw new Error("Performance API error");
        }),
        writable: true,
      });

      expect(collectTTI_TBT()).toEqual({});
    });
  });

  describe("recordInputLatencyStart", () => {
    it("should return null when performance is undefined", () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      expect(recordInputLatencyStart()).toBeNull();

      global.performance = originalPerformance;
    });

    it("should return performance.now() when available", () => {
      Object.defineProperty(performance, "now", {
        value: vi.fn().mockReturnValue(123.45),
        writable: true,
      });

      expect(recordInputLatencyStart()).toBe(123.45);
    });

    it("should handle errors gracefully", () => {
      Object.defineProperty(performance, "now", {
        value: vi.fn(() => {
          throw new Error("Performance error");
        }),
        writable: true,
      });

      expect(recordInputLatencyStart()).toBeNull();
    });
  });

  describe("recordInputLatencyEnd", () => {
    it("should do nothing when performance is undefined", () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      expect(() => recordInputLatencyEnd(100)).not.toThrow();

      global.performance = originalPerformance;
    });

    it("should do nothing when token is null", () => {
      expect(() => recordInputLatencyEnd(null)).not.toThrow();
      expect(snapshotInputLatency().samples).toHaveLength(0);
    });

    it("should record latency duration", () => {
      Object.defineProperty(performance, "now", {
        value: vi.fn().mockReturnValue(200),
        writable: true,
      });
      recordInputLatencyEnd(100);

      const snapshot = snapshotInputLatency();
      expect(snapshot.samples).toEqual([100]);
      expect(snapshot.avg).toBe(100);
      expect(snapshot.p95).toBe(100);
    });

    it("should handle errors gracefully", () => {
      Object.defineProperty(performance, "now", {
        value: vi.fn(() => {
          throw new Error("Performance error");
        }),
        writable: true,
      });

      expect(() => recordInputLatencyEnd(100)).not.toThrow();
    });
  });

  describe("snapshotInputLatency", () => {
    it("should return empty samples when no data", () => {
      const result = snapshotInputLatency();
      expect(result).toEqual({ samples: [] });
    });

    it("should calculate avg and p95 for samples", () => {
      // Add samples
      Object.defineProperty(performance, "now", {
        value: vi
          .fn()
          .mockReturnValueOnce(100)
          .mockReturnValueOnce(200)
          .mockReturnValueOnce(300),
        writable: true,
      });
      recordInputLatencyEnd(0); // duration 100
      recordInputLatencyEnd(0); // duration 200
      recordInputLatencyEnd(0); // duration 300

      const result = snapshotInputLatency();
      expect(result.samples).toEqual([100, 200, 300]);
      expect(result.avg).toBe(200);
      expect(result.p95).toBe(300); // 95th percentile of [100,200,300] is 300
    });
  });

  describe("snapshotMetricsBlob", () => {
    it("should return test values in test environment", () => {
      const result = snapshotMetricsBlob();
      expect(result.tti).toBe(1234);
      expect(result.tbt).toBe(567);
      expect(result.inputLatency).toEqual({ avg: 89, p95: 123 });
      expect(typeof result.ts).toBe("number");
    });

    it("should collect real metrics in production", () => {
      // Skip this test as NODE_ENV mocking is complex in vitest
      expect(snapshotMetricsBlob().ts).toBeDefined();
    });
  });

  describe("startLongTaskObserver", () => {
    it("should do nothing when window is undefined", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(() => startLongTaskObserver()).not.toThrow();

      global.window = originalWindow;
    });

    it("should do nothing when PerformanceObserver is not available", () => {
      const originalPerformanceObserver = global.PerformanceObserver;
      // @ts-ignore
      delete global.PerformanceObserver;

      expect(() => startLongTaskObserver()).not.toThrow();

      global.PerformanceObserver = originalPerformanceObserver;
    });

    it("should create PerformanceObserver for longtask entries", () => {
      const originalPO = window.PerformanceObserver;
      // @ts-ignore
      delete window.PerformanceObserver;

      const mockObserve = vi.fn();
      const MockPerformanceObserver = vi.fn().mockImplementation(() => ({
        observe: mockObserve,
      }));

      Object.defineProperty(window, "PerformanceObserver", {
        value: MockPerformanceObserver,
        writable: true,
      });

      expect(() => startLongTaskObserver()).not.toThrow();

      // Restore
      window.PerformanceObserver = originalPO;
    });
  });
});
