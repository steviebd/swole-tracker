import { describe, it, expect } from "vitest";
import {
  calculateWarmupSets,
  getWeightIncrement,
} from "~/lib/warmup-utils";

describe("calculateWarmupSets", () => {
  describe("light weights (≤50kg) - 5kg increments", () => {
    it("should calculate warmups for 40kg top set", () => {
      const warmups = calculateWarmupSets(40, 5);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([15, 20, 25, 30, 35]);
      expect(warmups.every((w) => w.reps === 5)).toBe(true);
      expect(warmups.every((w) => w.isWarmup === true)).toBe(true);
    });

    it("should calculate warmups for 30kg top set", () => {
      const warmups = calculateWarmupSets(30, 8);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([5, 10, 15, 20, 25]);
      expect(warmups.every((w) => w.reps === 8)).toBe(true);
    });

    it("should calculate warmups for 20kg top set", () => {
      const warmups = calculateWarmupSets(20, 10);

      expect(warmups).toHaveLength(3);
      expect(warmups.map((w) => w.weight)).toEqual([5, 10, 15]);
    });

    it("should calculate warmups for 50kg top set", () => {
      const warmups = calculateWarmupSets(50, 5);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([25, 30, 35, 40, 45]);
    });
  });

  describe("medium weights (51-100kg) - 10kg increments", () => {
    it("should calculate warmups for 60kg top set", () => {
      const warmups = calculateWarmupSets(60, 5);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([10, 20, 30, 40, 50]);
    });

    it("should calculate warmups for 80kg top set", () => {
      const warmups = calculateWarmupSets(80, 5);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([30, 40, 50, 60, 70]);
    });

    it("should calculate warmups for 100kg top set", () => {
      const warmups = calculateWarmupSets(100, 5);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([50, 60, 70, 80, 90]);
    });
  });

  describe("heavy weights (>100kg) - 20kg increments", () => {
    it("should calculate warmups for 140kg top set", () => {
      const warmups = calculateWarmupSets(140, 5);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([40, 60, 80, 100, 120]);
    });

    it("should calculate warmups for 180kg top set", () => {
      const warmups = calculateWarmupSets(180, 3);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([80, 100, 120, 140, 160]);
      expect(warmups.every((w) => w.reps === 3)).toBe(true);
    });

    it("should calculate warmups for 200kg top set", () => {
      const warmups = calculateWarmupSets(200, 1);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([100, 120, 140, 160, 180]);
    });

    it("should calculate warmups for 120kg top set", () => {
      const warmups = calculateWarmupSets(120, 5);

      expect(warmups).toHaveLength(5);
      expect(warmups.map((w) => w.weight)).toEqual([20, 40, 60, 80, 100]);
    });
  });

  describe("edge cases", () => {
    it("should return empty array for very light weights (≤10kg)", () => {
      expect(calculateWarmupSets(10, 10)).toEqual([]);
      expect(calculateWarmupSets(5, 10)).toEqual([]);
    });

    it("should return single warmup for 15kg", () => {
      const warmups = calculateWarmupSets(15, 10);

      expect(warmups).toHaveLength(2);
      expect(warmups.map((w) => w.weight)).toEqual([5, 10]);
    });

    it("should handle custom max warmup sets", () => {
      const warmups = calculateWarmupSets(140, 5, 3);

      expect(warmups).toHaveLength(3);
      // Should keep the highest warmups (closest to working weight)
      expect(warmups.map((w) => w.weight)).toEqual([80, 100, 120]);
    });

    it("should handle maxWarmupSets of 1", () => {
      const warmups = calculateWarmupSets(100, 5, 1);

      expect(warmups).toHaveLength(1);
      expect(warmups[0]!.weight).toBe(90);
    });

    it("should preserve reps for all warmup sets", () => {
      const warmups = calculateWarmupSets(80, 12);

      expect(warmups.every((w) => w.reps === 12)).toBe(true);
    });
  });

  describe("real-world scenarios", () => {
    it("should generate proper progression for bench press (80kg working)", () => {
      const warmups = calculateWarmupSets(80, 5);

      // 10kg increments for medium weight
      expect(warmups.map((w) => w.weight)).toEqual([30, 40, 50, 60, 70]);
    });

    it("should generate proper progression for squat (140kg working)", () => {
      const warmups = calculateWarmupSets(140, 5);

      // 20kg increments for heavy weight
      expect(warmups.map((w) => w.weight)).toEqual([40, 60, 80, 100, 120]);
    });

    it("should generate proper progression for overhead press (50kg working)", () => {
      const warmups = calculateWarmupSets(50, 8);

      // 5kg increments for light weight
      expect(warmups.map((w) => w.weight)).toEqual([25, 30, 35, 40, 45]);
    });
  });
});

describe("getWeightIncrement", () => {
  it("should return 5kg for weights ≤50kg", () => {
    expect(getWeightIncrement(20)).toBe(5);
    expect(getWeightIncrement(40)).toBe(5);
    expect(getWeightIncrement(50)).toBe(5);
  });

  it("should return 10kg for weights 51-100kg", () => {
    expect(getWeightIncrement(51)).toBe(10);
    expect(getWeightIncrement(75)).toBe(10);
    expect(getWeightIncrement(100)).toBe(10);
  });

  it("should return 20kg for weights >100kg", () => {
    expect(getWeightIncrement(101)).toBe(20);
    expect(getWeightIncrement(140)).toBe(20);
    expect(getWeightIncrement(200)).toBe(20);
  });
});
