import { describe, it, expect } from "vitest";
import { isWhoopTestUserId, getTestModeUserId } from "~/lib/whoop-user";

describe("whoop user", () => {
  describe("isWhoopTestUserId", () => {
    it("returns true for test user ID", () => {
      expect(isWhoopTestUserId(12345)).toBe(true);
    });

    it("returns false for other user IDs", () => {
      expect(isWhoopTestUserId(12346)).toBe(false);
      expect(isWhoopTestUserId(0)).toBe(false);
      expect(isWhoopTestUserId(-1)).toBe(false);
    });
  });

  describe("getTestModeUserId", () => {
    it("returns the test mode user ID", () => {
      expect(getTestModeUserId()).toBe("TEST_USER_12345");
    });
  });
});
