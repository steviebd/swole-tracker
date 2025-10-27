import { describe, it, expect, beforeEach, vi } from "vitest";
import { preferencesRouter } from "~/server/api/routers/preferences";

describe("preferencesRouter", () => {
  let db: any;
  let caller: any;

  beforeEach(() => {
    // Create a mock db that includes both the query interface and direct methods
    db = {
      query: {
        userPreferences: {
          findFirst: vi.fn(),
        },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue({}),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn().mockResolvedValue({}),
      })),
    };

    const ctx = {
      db,
      user: { id: "test-user-id" },
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = preferencesRouter.createCaller(ctx);
  });

  describe("get", () => {
    it("should return existing preferences", async () => {
      const mockPrefs = {
        user_id: "test-user-id",
        defaultWeightUnit: "lbs",
        predictive_defaults_enabled: true,
        right_swipe_action: "none",
        enable_manual_wellness: true,
        progression_type: "percentage",
        linear_progression_kg: "5.0",
        percentage_progression: "5.0",
      };

      db.query.userPreferences.findFirst.mockResolvedValue(mockPrefs);

      const result = await caller.get();

      expect(result).toEqual(mockPrefs);
    });

    it("should return default preferences when none exist", async () => {
      db.query.userPreferences.findFirst.mockResolvedValue(null);

      const result = await caller.get();

      expect(result).toEqual({
        defaultWeightUnit: "kg",
        predictive_defaults_enabled: false,
        right_swipe_action: "collapse_expand",
        enable_manual_wellness: false,
        progression_type: "adaptive",
        linear_progression_kg: "2.5",
        percentage_progression: "2.5",
        targetWorkoutsPerWeek: 3,
      });
    });
  });

  describe("update", () => {
    it("should update existing preferences with string input", async () => {
      const existingPrefs = {
        user_id: "test-user-id",
        defaultWeightUnit: "kg",
        predictive_defaults_enabled: false,
        right_swipe_action: "collapse_expand",
        enable_manual_wellness: false,
        progression_type: "adaptive",
        linear_progression_kg: 2.5,
        percentage_progression: 2.5,
      };

      db.query.userPreferences.findFirst.mockResolvedValue(existingPrefs);

      const result = await caller.update("lbs");

      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
    });

    it("should update existing preferences with object input", async () => {
      const existingPrefs = {
        user_id: "test-user-id",
        defaultWeightUnit: "kg",
        predictive_defaults_enabled: false,
        right_swipe_action: "collapse_expand",
        enable_manual_wellness: false,
        progression_type: "adaptive",
        linear_progression_kg: 2.5,
        percentage_progression: 2.5,
      };

      db.query.userPreferences.findFirst.mockResolvedValue(existingPrefs);

      const result = await caller.update({
        defaultWeightUnit: "lbs",
        predictive_defaults_enabled: true,
      });

      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
    });

    it("should create new preferences when none exist", async () => {
      db.query.userPreferences.findFirst.mockResolvedValue(null);

      const result = await caller.update({
        defaultWeightUnit: "lbs",
        enable_manual_wellness: true,
      });

      expect(result).toEqual({ success: true });
      expect(db.insert).toHaveBeenCalled();
    });

    it("should handle numeric progression values", async () => {
      db.query.userPreferences.findFirst.mockResolvedValue(null);

      const result = await caller.update({
        linear_progression_kg: "7.5",
        percentage_progression: "10.0",
      });

      expect(result).toEqual({ success: true });
      expect(db.insert).toHaveBeenCalled();
    });

    it("should reject invalid progression type", async () => {
      // Test with invalid enum values - should fail Zod validation
      await expect(
        caller.update({
          progression_type: "invalid_type",
        }),
      ).rejects.toThrow();
    });
  });
});
