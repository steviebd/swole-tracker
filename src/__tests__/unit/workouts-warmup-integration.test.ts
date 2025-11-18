/**
 * Integration tests for Warm-Up Sets volume calculations
 * Tests the volume breakdown utilities used by the workouts router
 */

import { describe, it, expect } from "vitest";
import { calculateVolumeBreakdown } from "~/server/api/utils/warmup-pattern-detection";

describe("Warm-Up Sets Volume Calculations", () => {

  describe("calculateVolumeBreakdown", () => {
    it("should separate volume by set type", () => {
      const sets = [
        { setType: "warmup", weight: 60, reps: 5 },
        { setType: "warmup", weight: 80, reps: 5 },
        { setType: "working", weight: 100, reps: 5 },
        { setType: "working", weight: 100, reps: 5 },
        { setType: "backoff", weight: 80, reps: 8 },
        { setType: "drop", weight: 60, reps: 10 },
      ];

      const breakdown = calculateVolumeBreakdown(sets);

      expect(breakdown.warmup).toBe(60 * 5 + 80 * 5); // 700
      expect(breakdown.working).toBe(100 * 5 * 2); // 1000
      expect(breakdown.backoff).toBe(80 * 8); // 640
      expect(breakdown.drop).toBe(60 * 10); // 600
      expect(breakdown.total).toBe(
        breakdown.warmup + breakdown.working + breakdown.backoff + breakdown.drop
      );
    });

    it("should handle empty sets array", () => {
      const breakdown = calculateVolumeBreakdown([]);

      expect(breakdown.total).toBe(0);
      expect(breakdown.warmup).toBe(0);
      expect(breakdown.working).toBe(0);
      expect(breakdown.backoff).toBe(0);
      expect(breakdown.drop).toBe(0);
    });

    it("should handle null weights", () => {
      const sets = [
        { setType: "warmup", weight: null, reps: 10 },
        { setType: "working", weight: 100, reps: 5 },
      ];

      const breakdown = calculateVolumeBreakdown(sets);

      expect(breakdown.warmup).toBe(0);
      expect(breakdown.working).toBe(500);
      expect(breakdown.total).toBe(500);
    });
  });
});
