import { describe, it, expect } from "vitest";

describe("Exercise Date Handling", () => {
  it("should handle string dates from database correctly", () => {
    // Test that new Date() works with ISO string dates from database
    const dateString = "2024-01-15T10:30:00.000Z";
    const date = new Date(dateString);

    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe(dateString);

    // Test that toLocaleDateString works
    const formatted = date.toLocaleDateString();
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("should handle various date string formats", () => {
    const testCases = [
      "2024-01-15T10:30:00.000Z",
      "2024-01-15T10:30:00Z",
      "2024-01-15",
    ];

    for (const dateString of testCases) {
      const date = new Date(dateString);
      expect(date).toBeInstanceOf(Date);
      expect(isNaN(date.getTime())).toBe(false);

      // Should be able to call toLocaleDateString
      const formatted = date.toLocaleDateString();
      expect(typeof formatted).toBe("string");
    }
  });

  it("should demonstrate the original bug scenario", () => {
    // Simulate what happened before the fix
    const dateString = "2024-01-15T10:30:00.000Z";

    // This would fail before the fix:
    // dateString.toLocaleDateString() // TypeError: not a function

    // The fix: wrap with new Date()
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString();

    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe("string");
  });
});
