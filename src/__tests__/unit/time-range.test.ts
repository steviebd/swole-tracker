import { describe, it, expect } from "vitest";
import {
  formatTimeRangeLabel,
  getWeeksForRange,
  getDaysForRange,
  type ProgressTimeRange,
} from "~/lib/time-range";

describe("time-range utilities", () => {
  describe("formatTimeRangeLabel", () => {
    it("should return long label by default", () => {
      expect(formatTimeRangeLabel("week")).toBe("This week");
      expect(formatTimeRangeLabel("month")).toBe("This month");
      expect(formatTimeRangeLabel("year")).toBe("This year");
    });

    it("should return short label when specified", () => {
      expect(formatTimeRangeLabel("week", { variant: "short" })).toBe("Week");
      expect(formatTimeRangeLabel("month", { variant: "short" })).toBe("Month");
      expect(formatTimeRangeLabel("year", { variant: "short" })).toBe("Year");
    });

    it("should return long label when variant is long", () => {
      expect(formatTimeRangeLabel("week", { variant: "long" })).toBe(
        "This week",
      );
      expect(formatTimeRangeLabel("month", { variant: "long" })).toBe(
        "This month",
      );
      expect(formatTimeRangeLabel("year", { variant: "long" })).toBe(
        "This year",
      );
    });

    it("should fallback to month when invalid range provided", () => {
      // @ts-expect-error Testing invalid input
      expect(formatTimeRangeLabel("invalid")).toBe("This month");
      // @ts-expect-error Testing invalid input
      expect(formatTimeRangeLabel("invalid", { variant: "short" })).toBe(
        "Month",
      );
    });
  });

  describe("getWeeksForRange", () => {
    it("should return correct weeks for each range", () => {
      expect(getWeeksForRange("week")).toBe(1);
      expect(getWeeksForRange("month")).toBe(4);
      expect(getWeeksForRange("year")).toBe(52);
    });

    it("should fallback to month when invalid range provided", () => {
      // @ts-expect-error Testing invalid input
      expect(getWeeksForRange("invalid")).toBe(4);
    });
  });

  describe("getDaysForRange", () => {
    it("should return correct days for each range", () => {
      expect(getDaysForRange("week")).toBe(7);
      expect(getDaysForRange("month")).toBe(30);
      expect(getDaysForRange("year")).toBe(365);
    });

    it("should fallback to month when invalid range provided", () => {
      // @ts-expect-error Testing invalid input
      expect(getDaysForRange("invalid")).toBe(30);
    });
  });
});
