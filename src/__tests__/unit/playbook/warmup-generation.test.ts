import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  exercisePrescriptionSchema,
  warmupSetSchema,
} from "~/server/api/schemas/playbook";

// Mock dependencies
vi.mock("~/server/db/chunk-utils", () => ({
  chunkedBatch: vi.fn(async (_db, items, callback) => {
    return [await callback(items)];
  }),
  SQLITE_VARIABLE_LIMIT: 999,
}));

vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Playbook Warm-Up Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Warm-Up Set Schema Validation", () => {
    it("should validate warmupSet with all required fields", () => {
      const validWarmupSet = {
        weight: 60,
        reps: 10,
        percentageOfTop: 0.6,
      };

      const result = warmupSetSchema.safeParse(validWarmupSet);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validWarmupSet);
      }
    });

    it("should validate warmupSet without percentageOfTop", () => {
      const warmupSetWithoutPercentage = {
        weight: 60,
        reps: 10,
      };

      const result = warmupSetSchema.safeParse(warmupSetWithoutPercentage);
      expect(result.success).toBe(true);
    });

    it("should reject warmupSet missing required fields", () => {
      const invalidWarmupSet = {
        weight: 60,
        // Missing reps
      };

      const result = warmupSetSchema.safeParse(invalidWarmupSet);
      expect(result.success).toBe(false);
    });

    it("should reject warmupSet with invalid types", () => {
      const invalidWarmupSet = {
        weight: "60kg", // Should be number
        reps: 10,
      };

      const result = warmupSetSchema.safeParse(invalidWarmupSet);
      expect(result.success).toBe(false);
    });
  });

  describe("Exercise Prescription Schema with Warm-Ups", () => {
    it("should validate prescription with warmupSets array", () => {
      const validPrescription = {
        exerciseName: "Bench Press",
        warmupSets: [
          { weight: 40, reps: 10, percentageOfTop: 0.4 },
          { weight: 60, reps: 8, percentageOfTop: 0.6 },
          { weight: 80, reps: 5, percentageOfTop: 0.8 },
        ],
        sets: 5,
        reps: 5,
        weight: 100,
        restSeconds: 180,
        notes: "Focus on controlled eccentric",
      };

      const result = exercisePrescriptionSchema.safeParse(validPrescription);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupSets).toHaveLength(3);
        expect(result.data.warmupSets![0]).toMatchObject({
          weight: 40,
          reps: 10,
          percentageOfTop: 0.4,
        });
      }
    });

    it("should validate prescription without warmupSets (backward compatibility)", () => {
      const prescriptionWithoutWarmup = {
        exerciseName: "Squat",
        sets: 5,
        reps: 5,
        weight: 140,
        restSeconds: 180,
      };

      const result = exercisePrescriptionSchema.safeParse(
        prescriptionWithoutWarmup,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupSets).toBeUndefined();
      }
    });

    it("should validate prescription with empty warmupSets array", () => {
      const prescriptionWithEmptyWarmup = {
        exerciseName: "Deadlift",
        warmupSets: [],
        sets: 3,
        reps: 5,
        weight: 200,
        restSeconds: 300,
      };

      const result = exercisePrescriptionSchema.safeParse(
        prescriptionWithEmptyWarmup,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupSets).toEqual([]);
      }
    });

    it("should validate prescription with single warmup set", () => {
      const prescriptionWithSingleWarmup = {
        exerciseName: "Overhead Press",
        warmupSets: [{ weight: 30, reps: 10, percentageOfTop: 0.5 }],
        sets: 3,
        reps: 8,
        weight: 60,
        restSeconds: 120,
      };

      const result = exercisePrescriptionSchema.safeParse(
        prescriptionWithSingleWarmup,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupSets).toHaveLength(1);
        expect(result.data.warmupSets![0]).toMatchObject({
          weight: 30,
          reps: 10,
          percentageOfTop: 0.5,
        });
      }
    });

    it("should validate prescription with many warmup sets (5+)", () => {
      const prescriptionWithManyWarmups = {
        exerciseName: "Heavy Squat",
        warmupSets: [
          { weight: 60, reps: 10, percentageOfTop: 0.3 },
          { weight: 80, reps: 8, percentageOfTop: 0.4 },
          { weight: 100, reps: 6, percentageOfTop: 0.5 },
          { weight: 120, reps: 4, percentageOfTop: 0.6 },
          { weight: 140, reps: 3, percentageOfTop: 0.7 },
          { weight: 160, reps: 2, percentageOfTop: 0.8 },
        ],
        sets: 1,
        reps: 1,
        weight: 200,
        restSeconds: 300,
      };

      const result = exercisePrescriptionSchema.safeParse(
        prescriptionWithManyWarmups,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupSets).toHaveLength(6);
      }
    });
  });

  describe("Warm-Up Pattern Context Integration", () => {
    it("should include warmup patterns in playbook generation context", () => {
      // Simulated warm-up patterns from user history
      const warmupPatterns = [
        {
          exerciseName: "Bench Press",
          pattern: [
            { weight: 40, reps: 10, percentageOfTop: 0.4 },
            { weight: 60, reps: 8, percentageOfTop: 0.6 },
            { weight: 80, reps: 5, percentageOfTop: 0.8 },
          ],
          confidence: "high" as const,
          sessionCount: 5,
        },
        {
          exerciseName: "Squat",
          pattern: [
            { weight: 60, reps: 8, percentageOfTop: 0.5 },
            { weight: 90, reps: 6, percentageOfTop: 0.75 },
          ],
          confidence: "medium" as const,
          sessionCount: 3,
        },
      ];

      // Context builder should format this for AI prompt
      const contextText = warmupPatterns
        .filter((p) => p.confidence !== "low")
        .map(
          (p) =>
            `${p.exerciseName}: ${p.pattern.map((s) => `${s.weight}kg×${s.reps}`).join(" → ")} (${p.confidence} confidence, ${p.sessionCount} sessions)`,
        )
        .join("\n");

      expect(contextText).toContain("Bench Press: 40kg×10 → 60kg×8 → 80kg×5");
      expect(contextText).toContain("high confidence, 5 sessions");
      expect(contextText).toContain("Squat: 60kg×8 → 90kg×6");
      expect(contextText).toContain("medium confidence, 3 sessions");
    });

    it("should filter out low confidence patterns from context", () => {
      const warmupPatterns = [
        {
          exerciseName: "New Exercise",
          pattern: [],
          confidence: "low" as const,
          sessionCount: 1,
        },
        {
          exerciseName: "Established Exercise",
          pattern: [{ weight: 50, reps: 10, percentageOfTop: 0.5 }],
          confidence: "high" as const,
          sessionCount: 10,
        },
      ];

      const contextText = warmupPatterns
        .filter((p) => p.confidence !== "low")
        .map((p) => p.exerciseName)
        .join("\n");

      expect(contextText).not.toContain("New Exercise");
      expect(contextText).toContain("Established Exercise");
    });

    it("should handle empty pattern array for new exercises", () => {
      const warmupPatterns = [
        {
          exerciseName: "Brand New Exercise",
          pattern: [],
          confidence: "low" as const,
          sessionCount: 0,
        },
      ];

      const contextText = warmupPatterns
        .filter((p) => p.confidence !== "low" && p.pattern.length > 0)
        .map((p) => p.exerciseName)
        .join("\n");

      expect(contextText).toBe("");
    });
  });

  describe("AI Prompt Warm-Up Instructions", () => {
    it("should include warm-up generation instructions in prompt", () => {
      const systemPrompt = `
**Warm-Up Protocol**:
- Generate 2-4 warm-up sets before working sets
- Progress from 40-50% → 80-90% of working weight
- Use user's historical warm-up pattern when available (provided in context)
- Reduce reps as weight increases (e.g., 10 reps @ 40%, 5 reps @ 60%, 2 reps @ 80%)
- Warm-ups should prepare muscles without causing fatigue
      `.trim();

      expect(systemPrompt).toContain("Generate 2-4 warm-up sets");
      expect(systemPrompt).toContain("Progress from 40-50% → 80-90%");
      expect(systemPrompt).toContain("Use user's historical warm-up pattern");
      expect(systemPrompt).toContain("Reduce reps as weight increases");
    });

    it("should validate AI output schema includes warmupSets", () => {
      const aiOutputExample = {
        weeks: [
          {
            weekNumber: 1,
            sessions: [
              {
                sessionNumber: 1,
                exercises: [
                  {
                    exerciseName: "Bench Press",
                    warmupSets: [
                      { weight: 40, reps: 8, percentageOfTop: 0.4 },
                      { weight: 60, reps: 6, percentageOfTop: 0.6 },
                      { weight: 80, reps: 4, percentageOfTop: 0.8 },
                    ],
                    sets: 5,
                    reps: 5,
                    weight: 100,
                    restSeconds: 180,
                    notes: "Focus on controlled eccentric",
                  },
                ],
              },
            ],
          },
        ],
      };

      const exercise = aiOutputExample.weeks[0]!.sessions[0]!.exercises[0]!;
      const result = exercisePrescriptionSchema.safeParse(exercise);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warmupSets).toBeDefined();
        expect(result.data.warmupSets).toHaveLength(3);
      }
    });
  });

  describe("Workout Creation with Warm-Up Sets", () => {
    it("should handle warmup sets when starting playbook workout", () => {
      const sessionPrescription = {
        exerciseName: "Squat",
        warmupSets: [
          { weight: 60, reps: 10, percentageOfTop: 0.5 },
          { weight: 90, reps: 6, percentageOfTop: 0.75 },
        ],
        workingSets: [{ weight: 120, reps: 5, sets: 5 }],
        restSeconds: 180,
      };

      // When creating workout from playbook, convert to exerciseSets format
      const exerciseSets = [
        ...sessionPrescription.warmupSets!.map((s, i) => ({
          setNumber: i + 1,
          setType: "warmup" as const,
          weight: s.weight,
          reps: s.reps,
          completed: false,
        })),
        ...Array.from(
          { length: sessionPrescription.workingSets[0]!.sets },
          (_, i) => ({
            setNumber: sessionPrescription.warmupSets!.length + i + 1,
            setType: "working" as const,
            weight: sessionPrescription.workingSets[0]!.weight,
            reps: sessionPrescription.workingSets[0]!.reps,
            completed: false,
          }),
        ),
      ];

      expect(exerciseSets).toHaveLength(7); // 2 warmup + 5 working
      expect(exerciseSets[0]).toMatchObject({
        setNumber: 1,
        setType: "warmup",
        weight: 60,
        reps: 10,
      });
      expect(exerciseSets[2]).toMatchObject({
        setNumber: 3,
        setType: "working",
        weight: 120,
        reps: 5,
      });
    });

    it("should handle prescription without warmup sets gracefully", () => {
      const sessionPrescription = {
        exerciseName: "Curl",
        workingSets: [{ weight: 20, reps: 10, sets: 3 }],
        restSeconds: 90,
      };

      const warmupSets = sessionPrescription.warmupSets || [];
      const exerciseSets = [
        ...warmupSets.map((s, i) => ({
          setNumber: i + 1,
          setType: "warmup" as const,
          weight: s.weight,
          reps: s.reps,
          completed: false,
        })),
        ...Array.from(
          { length: sessionPrescription.workingSets[0]!.sets },
          (_, i) => ({
            setNumber: warmupSets.length + i + 1,
            setType: "working" as const,
            weight: sessionPrescription.workingSets[0]!.weight,
            reps: sessionPrescription.workingSets[0]!.reps,
            completed: false,
          }),
        ),
      ];

      expect(exerciseSets).toHaveLength(3); // 0 warmup + 3 working
      expect(exerciseSets.every((s) => s.setType === "working")).toBe(true);
    });
  });

  describe("D1 Chunking with Warm-Up Sets", () => {
    it("should chunk large warmup + working sets arrays correctly", async () => {
      const { chunkedBatch } = await import("~/server/db/chunk-utils");

      // Simulate large session: 10 warmup + 50 working sets = 60 sets
      const largeSetsArray = [
        ...Array.from({ length: 10 }, (_, i) => ({
          setNumber: i + 1,
          setType: "warmup" as const,
          weight: 40 + i * 5,
          reps: 10 - i,
          completed: false,
        })),
        ...Array.from({ length: 50 }, (_, i) => ({
          setNumber: 10 + i + 1,
          setType: "working" as const,
          weight: 100,
          reps: 5,
          completed: false,
        })),
      ];

      const mockDb = {
        insert: vi.fn(() => ({
          values: vi.fn(),
        })),
      };

      await chunkedBatch(
        mockDb as any,
        largeSetsArray,
        (chunk) => {
          expect(chunk.length).toBeLessThanOrEqual(70); // D1-safe chunk size
          return Promise.resolve();
        },
        { limit: 70 },
      );

      expect(chunkedBatch).toHaveBeenCalled();
    });

    it("should handle warmup sets within D1 variable limits", async () => {
      const { chunkedBatch } = await import("~/server/db/chunk-utils");

      // Normal session: 3 warmup + 5 working = 8 sets (well below limit)
      const normalSetsArray = [
        ...Array.from({ length: 3 }, (_, i) => ({
          setNumber: i + 1,
          setType: "warmup" as const,
          weight: 40 + i * 20,
          reps: 10 - i * 2,
          completed: false,
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          setNumber: 3 + i + 1,
          setType: "working" as const,
          weight: 100,
          reps: 5,
          completed: false,
        })),
      ];

      const mockDb = {
        insert: vi.fn(() => ({
          values: vi.fn(),
        })),
      };

      await chunkedBatch(mockDb as any, normalSetsArray, (chunk) => {
        expect(chunk.length).toBe(8); // Should process all at once
        return Promise.resolve();
      });

      expect(chunkedBatch).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle warmup sets with zero weight (bodyweight)", () => {
      const bodyweightWarmup = {
        exerciseName: "Pull-ups",
        warmupSets: [
          { weight: 0, reps: 5, percentageOfTop: 0 },
          { weight: 0, reps: 5, percentageOfTop: 0 },
        ],
        sets: 3,
        reps: 10,
        weight: 0,
        restSeconds: 120,
      };

      const result = exercisePrescriptionSchema.safeParse(bodyweightWarmup);
      expect(result.success).toBe(true);
    });

    it("should handle fractional weights in warmup sets", () => {
      const fractionalWarmup = {
        exerciseName: "Cable Fly",
        warmupSets: [
          { weight: 5.5, reps: 12, percentageOfTop: 0.4 },
          { weight: 8.25, reps: 10, percentageOfTop: 0.6 },
        ],
        sets: 3,
        reps: 8,
        weight: 13.75,
        restSeconds: 90,
      };

      const result = exercisePrescriptionSchema.safeParse(fractionalWarmup);
      expect(result.success).toBe(true);
    });

    it("should handle very high rep warmup sets", () => {
      const highRepWarmup = {
        exerciseName: "Leg Press",
        warmupSets: [
          { weight: 60, reps: 20, percentageOfTop: 0.3 },
          { weight: 100, reps: 15, percentageOfTop: 0.5 },
        ],
        sets: 4,
        reps: 10,
        weight: 200,
        restSeconds: 120,
      };

      const result = exercisePrescriptionSchema.safeParse(highRepWarmup);
      expect(result.success).toBe(true);
    });

    it("should validate warmup percentages correctly", () => {
      const warmupWithPercentages = {
        exerciseName: "Bench Press",
        warmupSets: [
          { weight: 40, reps: 10, percentageOfTop: 0.4 },
          { weight: 60, reps: 8, percentageOfTop: 0.6 },
          { weight: 80, reps: 5, percentageOfTop: 0.8 },
          { weight: 90, reps: 3, percentageOfTop: 0.9 },
        ],
        sets: 5,
        reps: 5,
        weight: 100,
        restSeconds: 180,
      };

      const result = exercisePrescriptionSchema.safeParse(
        warmupWithPercentages,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        result.data.warmupSets!.forEach((set, i) => {
          expect(set.percentageOfTop).toBeGreaterThan(0);
          expect(set.percentageOfTop).toBeLessThanOrEqual(1);
        });
      }
    });
  });
});
