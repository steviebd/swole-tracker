import type { WhoopMetrics } from "~/server/api/schemas/health-advice";

export function clip(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateReadiness(whoop: WhoopMetrics): {
  rho: number;
  flags: string[];
} {
  const flags: string[] = [];
  
  // Component calculations with fallbacks
  const c = whoop.recovery_score != null ? whoop.recovery_score / 100 : 0.5;
  const s = whoop.sleep_performance != null ? whoop.sleep_performance / 100 : 0.5;
  
  let h = 1.0;
  if (whoop.hrv_now_ms && whoop.hrv_baseline_ms) {
    h = clip(whoop.hrv_now_ms / whoop.hrv_baseline_ms, 0.8, 1.2);
  } else {
    flags.push('missing_hrv');
  }
  
  let r = 1.0;
  if (whoop.rhr_now_bpm && whoop.rhr_baseline_bpm) {
    r = clip(whoop.rhr_baseline_bpm / whoop.rhr_now_bpm, 0.8, 1.2);
  } else {
    flags.push('missing_rhr');
  }
  
  let rho = clip(0.4 * c + 0.3 * s + 0.15 * h + 0.15 * r, 0, 1);
  
  // Optional strain adjustment
  if (whoop.yesterday_strain && whoop.yesterday_strain > 14) {
    rho = Math.max(0, rho - 0.05);
    flags.push('high_strain_yesterday');
  }
  
  // Add descriptive flags
  if (c < 0.6) flags.push('low_recovery');
  if (s < 0.6) flags.push('poor_sleep');
  if (c >= 0.8) flags.push('good_recovery');
  if (s >= 0.8) flags.push('good_sleep');
  
  return { rho, flags };
}

export function calculateOverloadMultiplier(
  rho: number,
  experienceLevel: string
): number {
  let delta = clip(1 + 0.3 * (rho - 0.5), 0.9, 1.1);
  
  // Beginner safety cap
  if (experienceLevel === 'beginner') {
    delta = Math.min(delta, 1.05);
  }
  
  return delta;
}

export function roundToIncrement(
  weight: number,
  increment = 2.5
): number {
  return Math.round(weight / increment) * increment;
}