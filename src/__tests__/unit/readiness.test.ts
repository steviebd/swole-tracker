import { describe, it, expect } from "vitest";
import { getReadinessSummary } from "~/lib/readiness";

describe("readiness", () => {
  describe("getReadinessSummary", () => {
    it("returns awaiting data for null score", () => {
      const result = getReadinessSummary(null);
      expect(result).toEqual({
        label: "Awaiting data",
        tone: "warning",
        message:
          "Complete a workout or sync Whoop to unlock readiness insights.",
      });
    });

    it("returns awaiting data for undefined score", () => {
      const result = getReadinessSummary(undefined);
      expect(result).toEqual({
        label: "Awaiting data",
        tone: "warning",
        message:
          "Complete a workout or sync Whoop to unlock readiness insights.",
      });
    });

    it("returns awaiting data for NaN score", () => {
      const result = getReadinessSummary(NaN);
      expect(result).toEqual({
        label: "Awaiting data",
        tone: "warning",
        message:
          "Complete a workout or sync Whoop to unlock readiness insights.",
      });
    });

    it("returns high readiness for score >= 0.8", () => {
      const result = getReadinessSummary(0.9);
      expect(result).toEqual({
        label: "High readiness",
        tone: "success",
        message: "Prime to push volume or intensity today.",
      });
    });

    it("returns ready to train for score >= 0.6", () => {
      const result = getReadinessSummary(0.7);
      expect(result).toEqual({
        label: "Ready to train",
        tone: "info",
        message: "Solid recovery. Maintain planned progression.",
      });
    });

    it("returns monitor fatigue for score >= 0.4", () => {
      const result = getReadinessSummary(0.5);
      expect(result).toEqual({
        label: "Monitor fatigue",
        tone: "warning",
        message: "Keep sets quality high and taper accessories if you need it.",
      });
    });

    it("returns recover & recharge for score < 0.4", () => {
      const result = getReadinessSummary(0.3);
      expect(result).toEqual({
        label: "Recover & recharge",
        tone: "danger",
        message:
          "Dial back intensity and prioritise mobility or recovery work.",
      });
    });

    it("handles boundary values", () => {
      expect(getReadinessSummary(0.8).tone).toBe("success");
      expect(getReadinessSummary(0.6).tone).toBe("info");
      expect(getReadinessSummary(0.4).tone).toBe("warning");
      expect(getReadinessSummary(0.39).tone).toBe("danger");
    });
  });
});
