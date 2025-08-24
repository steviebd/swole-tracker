/**
 * Unit tests for formatSafeDate utility function
 * Ensures it handles both Date objects and ISO strings correctly
 */

import { formatSafeDate } from "~/lib/utils";

describe("formatSafeDate", () => {
  const testDate = new Date("2025-08-24T10:30:00.000Z");
  const testISOString = "2025-08-24T10:30:00.000Z";
  const invalidString = "not-a-date";

  it("should format a Date object correctly", () => {
    const result = formatSafeDate(testDate);
    expect(result).toBe(testDate.toLocaleDateString());
  });

  it("should format an ISO string correctly", () => {
    const result = formatSafeDate(testISOString);
    expect(result).toBe(testDate.toLocaleDateString());
  });

  it("should format a Date object with options", () => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const result = formatSafeDate(testDate, options);
    expect(result).toBe(testDate.toLocaleDateString(undefined, options));
  });

  it("should format an ISO string with options", () => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const result = formatSafeDate(testISOString, options);
    expect(result).toBe(testDate.toLocaleDateString(undefined, options));
  });

  it("should handle null values", () => {
    const result = formatSafeDate(null);
    expect(result).toBe("Unknown date");
  });

  it("should handle undefined values", () => {
    const result = formatSafeDate(undefined);
    expect(result).toBe("Unknown date");
  });

  it("should handle invalid date strings", () => {
    const result = formatSafeDate(invalidString);
    expect(result).toBe("Invalid date");
  });

  it("should handle SQLite datetime format", () => {
    const sqliteDate = "2025-08-24 10:30:00";
    const result = formatSafeDate(sqliteDate);
    // Should parse as UTC and format correctly
    expect(result).toMatch(/8\/24\/2025|24\/8\/2025|2025[/-]8[/-]24/);
  });
});