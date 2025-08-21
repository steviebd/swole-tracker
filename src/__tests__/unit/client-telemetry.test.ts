import { describe, it, expect, beforeEach } from "vitest";
import {
  getDeviceType,
  getThemeUsed,
  recordInputLatencyStart,
  recordInputLatencyEnd,
  snapshotInputLatency,
  resetInputLatencySamples,
} from "~/lib/client-telemetry";

describe("getDeviceType function", () => {
  it("should return a string value", () => {
    const result = getDeviceType();
    expect(typeof result).toBe("string");
  });

  it("should handle function call without throwing", () => {
    expect(() => getDeviceType()).not.toThrow();
  });
});

describe("getThemeUsed function", () => {
  it("should return null or string", () => {
    const result = getThemeUsed();
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("should handle function call without throwing", () => {
    expect(() => getThemeUsed()).not.toThrow();
  });
});

describe("input latency functions", () => {
  beforeEach(() => {
    resetInputLatencySamples();
  });

  it("should record input latency start", () => {
    const token = recordInputLatencyStart();
    expect(typeof token === "number" || token === null).toBe(true);
  });

  it("should record input latency end", () => {
    const token = recordInputLatencyStart();
    expect(() => recordInputLatencyEnd(token)).not.toThrow();
  });

  it("should handle null token in end recording", () => {
    expect(() => recordInputLatencyEnd(null)).not.toThrow();
  });

  it("should return snapshot with expected structure", () => {
    const snapshot = snapshotInputLatency();
    expect(snapshot).toHaveProperty("samples");
    expect(Array.isArray(snapshot.samples)).toBe(true);
  });
});
