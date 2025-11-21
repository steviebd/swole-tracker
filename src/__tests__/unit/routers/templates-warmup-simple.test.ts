import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { randomUUID } from "crypto";

// Test the Zod schema validation directly without router complexity
describe("Templates Router - Warm-Up Config Schema Validation", () => {
  const createTemplateSchema = z.object({
    name: z.string().min(1).max(256),
    exercises: z.array(z.string().min(1).max(256)),
    dedupeKey: z.string().uuid(),
    warmupConfig: z.record(z.string(), z.any()).optional(),
  });

  const generateValidUUID = () => randomUUID();

  describe("Zod Schema Validation", () => {
    it("should accept valid template with warmupConfig", () => {
      const warmupConfig = {
        "Bench Press": {
          enabled: true,
          type: "percentage",
          sets: [{ percentage: 40, reps: 10 }],
        },
      };

      const result = createTemplateSchema.safeParse({
        name: "Push Day",
        dedupeKey: generateValidUUID(),
        exercises: ["Bench Press", "Squat"],
        warmupConfig,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupConfig).toEqual(warmupConfig);
      }
    });

    it("should accept valid template without warmupConfig", () => {
      const result = createTemplateSchema.safeParse({
        name: "Pull Day",
        dedupeKey: generateValidUUID(),
        exercises: ["Deadlift"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupConfig).toBeUndefined();
      }
    });

    it("should accept empty warmupConfig object", () => {
      const result = createTemplateSchema.safeParse({
        name: "Leg Day",
        dedupeKey: generateValidUUID(),
        exercises: ["Leg Press"],
        warmupConfig: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupConfig).toEqual({});
      }
    });

    it("should reject invalid UUID for dedupeKey", () => {
      const result = createTemplateSchema.safeParse({
        name: "Invalid UUID Test",
        dedupeKey: "not-a-uuid",
        exercises: ["Bench Press"],
        warmupConfig: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("dedupeKey");
        expect(result.error.issues[0]?.message).toContain("UUID");
      }
    });

    it("should reject exercises as objects instead of strings", () => {
      const result = createTemplateSchema.safeParse({
        name: "Invalid Exercises Test",
        dedupeKey: generateValidUUID(),
        exercises: [
          { exerciseName: "Bench Press" }, // This should be a string
        ] as any,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("exercises");
        expect(result.error.issues[0]?.message).toContain("string");
      }
    });

    it("should accept warmupConfig with special characters in exercise names", () => {
      const specialConfig = {
        "Barbell Bench Press (Close Grip)": {
          enabled: true,
          type: "percentage",
        },
        "Dumbbell Row - 45°": {
          enabled: true,
          type: "fixed",
        },
      };

      const result = createTemplateSchema.safeParse({
        name: "Special Chars Template",
        dedupeKey: generateValidUUID(),
        exercises: ["Barbell Bench Press (Close Grip)", "Dumbbell Row - 45°"],
        warmupConfig: specialConfig,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupConfig).toEqual(specialConfig);
      }
    });

    it("should accept very large warmupConfig objects", () => {
      const largeConfig: Record<string, any> = {};
      for (let i = 0; i < 50; i++) {
        largeConfig[`Exercise ${i}`] = {
          enabled: true,
          type: "percentage",
          sets: Array.from({ length: 10 }, (_, j) => ({
            percentage: 30 + j * 5,
            reps: 10 - j,
          })),
        };
      }

      const result = createTemplateSchema.safeParse({
        name: "Large Config Template",
        dedupeKey: generateValidUUID(),
        exercises: Array.from({ length: 50 }, (_, i) => `Exercise ${i}`),
        warmupConfig: largeConfig,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.data.warmupConfig!)).toHaveLength(50);
      }
    });
  });
});
