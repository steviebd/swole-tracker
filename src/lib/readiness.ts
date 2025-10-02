export type ReadinessTone = "success" | "info" | "warning" | "danger";

export interface ReadinessSummary {
  label: string;
  tone: ReadinessTone;
  message: string;
}

export function getReadinessSummary(score: number | null | undefined): ReadinessSummary {
  if (score == null || Number.isNaN(score)) {
    return {
      label: "Awaiting data",
      tone: "warning",
      message: "Complete a workout or sync Whoop to unlock readiness insights.",
    };
  }

  if (score >= 0.8) {
    return {
      label: "High readiness",
      tone: "success",
      message: "Prime to push volume or intensity today.",
    };
  }

  if (score >= 0.6) {
    return {
      label: "Ready to train",
      tone: "info",
      message: "Solid recovery. Maintain planned progression.",
    };
  }

  if (score >= 0.4) {
    return {
      label: "Monitor fatigue",
      tone: "warning",
      message: "Keep sets quality high and taper accessories if you need it.",
    };
  }

  return {
    label: "Recover & recharge",
    tone: "danger",
    message: "Dial back intensity and prioritise mobility or recovery work.",
  };
}
