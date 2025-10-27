import { describe, it, expect } from "vitest";
import { getReadinessSummary } from "~/lib/readiness";

describe("getReadinessSummary", () => {
  it("should return awaiting data for null score", () => {
    const result = getReadinessSummary(null);
    expect(result).toEqual({
      label: "Awaiting data",
      tone: "warning",
      message: "Complete a workout or sync Whoop to unlock readiness insights.",
    });
  });

  it("should return awaiting data for undefined score", () => {
    const result = getReadinessSummary(undefined);
    expect(result).toEqual({
      label: "Awaiting data",
      tone: "warning",
      message: "Complete a workout or sync Whoop to unlock readiness insights.",
    });
  });

  it("should return awaiting data for NaN score", () => {
    const result = getReadinessSummary(NaN);
    expect(result).toEqual({
      label: "Awaiting data",
      tone: "warning",
      message: "Complete a workout or sync Whoop to unlock readiness insights.",
    });
  });

  it("should return high readiness for score >= 0.8", () => {
    expect(getReadinessSummary(0.8)).toEqual({
      label: "High readiness",
      tone: "success",
      message: "Prime to push volume or intensity today.",
    });

    expect(getReadinessSummary(0.9)).toEqual({
      label: "High readiness",
      tone: "success",
      message: "Prime to push volume or intensity today.",
    });

    expect(getReadinessSummary(1.0)).toEqual({
      label: "High readiness",
      tone: "success",
      message: "Prime to push volume or intensity today.",
    });
  });

  it("should return ready to train for score >= 0.6 and < 0.8", () => {
    expect(getReadinessSummary(0.6)).toEqual({
      label: "Ready to train",
      tone: "info",
      message: "Solid recovery. Maintain planned progression.",
    });

    expect(getReadinessSummary(0.7)).toEqual({
      label: "Ready to train",
      tone: "info",
      message: "Solid recovery. Maintain planned progression.",
    });
  });

  it("should return monitor fatigue for score >= 0.4 and < 0.6", () => {
    expect(getReadinessSummary(0.4)).toEqual({
      label: "Monitor fatigue",
      tone: "warning",
      message: "Keep sets quality high and taper accessories if you need it.",
    });

    expect(getReadinessSummary(0.5)).toEqual({
      label: "Monitor fatigue",
      tone: "warning",
      message: "Keep sets quality high and taper accessories if you need it.",
    });
  });

  it("should return recover and recharge for score < 0.4", () => {
    expect(getReadinessSummary(0.3)).toEqual({
      label: "Recover & recharge",
      tone: "danger",
      message: "Dial back intensity and prioritise mobility or recovery work.",
    });

    expect(getReadinessSummary(0.1)).toEqual({
      label: "Recover & recharge",
      tone: "danger",
      message: "Dial back intensity and prioritise mobility or recovery work.",
    });

    expect(getReadinessSummary(0)).toEqual({
      label: "Recover & recharge",
      tone: "danger",
      message: "Dial back intensity and prioritise mobility or recovery work.",
    });
  });
});
