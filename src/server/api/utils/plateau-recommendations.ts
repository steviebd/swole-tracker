import type {
  PlateauRecommendation,
  PlateauDetectionContext,
} from "~/server/api/types/plateau-milestone";
import type { ExperienceLevel } from "~/server/api/schemas/plateau-milestone";

/**
 * Generate personalized recommendations for breaking through plateaus
 *
 * Uses evidence-based training principles to provide actionable advice
 * tailored to the user's experience level and plateau characteristics
 *
 * @param context - Plateau detection context with user data
 * @returns Array of personalized recommendations
 */
export function generatePlateauRecommendations(
  context: PlateauDetectionContext,
): PlateauRecommendation[] {
  const { sessions, experienceLevel, maintenanceMode } = context;

  if (maintenanceMode) {
    return [getMaintenanceRecommendation()];
  }

  const recommendations: PlateauRecommendation[] = [];

  // Analyze the plateau characteristics
  const plateauAnalysis = analyzePlateau(sessions);

  // Generate recommendations based on analysis
  recommendations.push(
    ...getVolumeRecommendations(plateauAnalysis, experienceLevel),
  );
  recommendations.push(
    ...getIntensityRecommendations(plateauAnalysis, experienceLevel),
  );
  recommendations.push(
    ...getVariationRecommendations(plateauAnalysis, experienceLevel),
  );
  recommendations.push(
    ...getRecoveryRecommendations(plateauAnalysis, experienceLevel),
  );
  recommendations.push(
    ...getPeriodizationRecommendations(plateauAnalysis, experienceLevel),
  );

  // Sort by priority and limit to top recommendations
  return recommendations
    .sort((a, b) => getPriorityScore(b.priority) - getPriorityScore(a.priority))
    .slice(0, 6); // Top 6 recommendations
}

/**
 * Analyze plateau characteristics from session data
 */
function analyzePlateau(
  sessions: Array<{
    weight: number;
    reps: number;
    date: Date;
    oneRMEstimate?: number;
  }>,
) {
  if (sessions.length === 0) {
    return {
      avgWeight: 0,
      avgReps: 0,
      avgVolume: 0,
      weightVariance: 0,
      repsVariance: 0,
      volumeTrend: "stable" as "stable" | "increasing" | "decreasing",
      intensityLevel: "low" as "low" | "moderate" | "high",
      consistencyScore: 0,
    };
  }

  const volumes = sessions.map((s) => s.weight * s.reps);
  const weights = sessions.map((s) => s.weight);
  const reps = sessions.map((s) => s.reps);

  const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  const avgReps = reps.reduce((sum, r) => sum + r, 0) / reps.length;
  const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;

  // Calculate variance
  const weightVariance = calculateVariance(weights);
  const repsVariance = calculateVariance(reps);

  // Calculate volume trend
  const volumeTrend = calculateTrend(volumes);

  // Determine intensity level (based on average reps)
  let intensityLevel: "low" | "moderate" | "high";
  if (avgReps >= 8) intensityLevel = "low";
  else if (avgReps >= 5) intensityLevel = "moderate";
  else intensityLevel = "high";

  // Calculate consistency score (how similar are the sessions)
  const consistencyScore = Math.max(
    0,
    100 - (weightVariance + repsVariance) * 10,
  );

  return {
    avgWeight,
    avgReps,
    avgVolume,
    weightVariance,
    repsVariance,
    volumeTrend,
    intensityLevel,
    consistencyScore,
  };
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDiffs = numbers.map((num) => Math.pow(num - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;

  return variance;
}

/**
 * Calculate trend of an array of numbers
 */
function calculateTrend(
  numbers: number[],
): "stable" | "increasing" | "decreasing" {
  if (numbers.length < 2) return "stable";

  const firstHalf = numbers.slice(0, Math.floor(numbers.length / 2));
  const secondHalf = numbers.slice(Math.floor(numbers.length / 2));

  const firstAvg = firstHalf.reduce((sum, n) => sum + n, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, n) => sum + n, 0) / secondHalf.length;

  const difference = secondAvg - firstAvg;
  const threshold = firstAvg * 0.05; // 5% threshold

  if (Math.abs(difference) < threshold) return "stable";
  return difference > 0 ? "increasing" : "decreasing";
}

/**
 * Get volume-based recommendations
 */
function getVolumeRecommendations(
  analysis: any,
  experienceLevel: ExperienceLevel,
): PlateauRecommendation[] {
  const recommendations: PlateauRecommendation[] = [];

  if (analysis.volumeTrend === "decreasing") {
    recommendations.push({
      rule: "volume_overload",
      description:
        "Your training volume has been decreasing. Progressive overload is key to breaking plateaus.",
      action:
        "Increase total weekly volume by 10-15% through additional sets or slightly higher weight.",
      playbookCTA: true,
      priority: "high",
    });
  }

  if (analysis.intensityLevel === "high" && analysis.avgReps < 5) {
    recommendations.push({
      rule: "volume_accumulation",
      description:
        "You're training with very high intensity but low volume. Consider a volume phase.",
      action:
        "Reduce weight by 10-15% and increase reps to 8-12 per set for 2-3 weeks.",
      playbookCTA: true,
      priority: "medium",
    });
  }

  return recommendations;
}

/**
 * Get intensity-based recommendations
 */
function getIntensityRecommendations(
  analysis: any,
  experienceLevel: ExperienceLevel,
): PlateauRecommendation[] {
  const recommendations: PlateauRecommendation[] = [];

  if (analysis.intensityLevel === "low" && analysis.avgReps > 10) {
    recommendations.push({
      rule: "intensity_increase",
      description:
        "Your training intensity is quite low. Heavier weights will stimulate new adaptation.",
      action:
        "Increase weight so you're working in the 6-8 rep range for main compound lifts.",
      playbookCTA: true,
      priority: "high",
    });
  }

  if (analysis.consistencyScore > 80) {
    recommendations.push({
      rule: "intensive_technique",
      description:
        "You're very consistent but may need intensity variation. Time to focus on strength.",
      action:
        "Implement heavy doubles/triples (2-3 reps) at 85-90% of your 1RM for 2 weeks.",
      playbookCTA: false,
      priority: "medium",
    });
  }

  return recommendations;
}

/**
 * Get exercise variation recommendations
 */
function getVariationRecommendations(
  analysis: any,
  experienceLevel: ExperienceLevel,
): PlateauRecommendation[] {
  const recommendations: PlateauRecommendation[] = [];

  if (analysis.weightVariance < 5) {
    recommendations.push({
      rule: "exercise_variation",
      description:
        "You're using very similar weights. Exercise variation can stimulate new growth.",
      action:
        "Switch to close-grip or pause variations for 2-3 weeks to overcome adaptation.",
      playbookCTA: true,
      priority: "medium",
    });
  }

  if (experienceLevel === "advanced") {
    recommendations.push({
      rule: "specialization",
      description:
        "As an advanced lifter, you may need specialized techniques.",
      action:
        "Try cluster sets, partial reps, or isometric holds for 1-2 weeks.",
      playbookCTA: false,
      priority: "low",
    });
  }

  return recommendations;
}

/**
 * Get recovery-based recommendations
 */
function getRecoveryRecommendations(
  analysis: any,
  experienceLevel: ExperienceLevel,
): PlateauRecommendation[] {
  const recommendations: PlateauRecommendation[] = [];

  if (analysis.volumeTrend === "stable" && analysis.intensityLevel === "high") {
    recommendations.push({
      rule: "recovery_focus",
      description:
        "High intensity with stable volume may indicate recovery issues.",
      action:
        "Take a deload week (50% volume) or add 2 extra rest days before next training block.",
      playbookCTA: false,
      priority: "medium",
    });
  }

  recommendations.push({
    rule: "sleep_optimization",
    description: "Sleep is critical for recovery and breaking plateaus.",
    action:
      "Ensure 7-9 hours of quality sleep and maintain consistent sleep schedule.",
    playbookCTA: false,
    priority: "low",
  });

  return recommendations;
}

/**
 * Get periodization recommendations
 */
function getPeriodizationRecommendations(
  analysis: any,
  experienceLevel: ExperienceLevel,
): PlateauRecommendation[] {
  const recommendations: PlateauRecommendation[] = [];

  if (experienceLevel === "intermediate" || experienceLevel === "advanced") {
    recommendations.push({
      rule: "periodization",
      description: "Structured periodization can prevent long-term plateaus.",
      action:
        "Implement a 4-week block: 2 weeks volume focus, 1 week intensity, 1 week deload.",
      playbookCTA: true,
      priority: "medium",
    });
  }

  if (analysis.consistencyScore > 90) {
    recommendations.push({
      rule: "strategic_deconditioning",
      description: "Very high consistency sometimes requires strategic breaks.",
      action:
        "Take 5-7 days completely off training to allow full recovery and supercompensation.",
      playbookCTA: false,
      priority: "low",
    });
  }

  return recommendations;
}

/**
 * Get maintenance mode recommendation
 */
function getMaintenanceRecommendation(): PlateauRecommendation {
  return {
    rule: "maintenance_mode",
    description: "This exercise is currently in maintenance mode.",
    action:
      "Focus on other lifts while maintaining current strength. Consider switching back to tracking when ready to progress.",
    playbookCTA: false,
    priority: "low",
  };
}

/**
 * Get priority score for sorting
 */
function getPriorityScore(priority: "low" | "medium" | "high"): number {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

/**
 * Get personalized recommendation based on specific plateau type
 */
export function getSpecificPlateauRecommendation(
  plateauType: "strength" | "hypertrophy" | "endurance" | "technique",
  experienceLevel: ExperienceLevel,
): PlateauRecommendation {
  const recommendations: Record<string, PlateauRecommendation> = {
    strength: {
      rule: "strength_plateau",
      description:
        "You've hit a strength plateau. Time for neural adaptation focus.",
      action:
        "Work with 85-95% intensity for 1-3 reps per set, with longer rest periods (3-5 minutes).",
      playbookCTA: true,
      priority: "high",
    },
    hypertrophy: {
      rule: "hypertrophy_plateau",
      description:
        "Muscle growth has stalled. Volume and time under tension need adjustment.",
      action:
        "Increase training volume by 20% and focus on 2-3 second eccentric phases.",
      playbookCTA: true,
      priority: "high",
    },
    endurance: {
      rule: "endurance_plateau",
      description:
        "Muscular endurance has plateaued. Metabolic stress is needed.",
      action:
        "Implement drop sets, supersets, or rest-pause techniques to increase metabolic demand.",
      playbookCTA: false,
      priority: "medium",
    },
    technique: {
      rule: "technique_plateau",
      description: "Technical limitations may be holding back progress.",
      action:
        "Film your lifts and work with lighter weights to perfect form before progressing.",
      playbookCTA: false,
      priority: "high",
    },
  };

  return recommendations[plateauType] ?? recommendations["strength"]!;
}

/**
 * Filter recommendations by user preferences
 */
export function filterRecommendationsByPreferences(
  recommendations: PlateauRecommendation[],
  preferences: {
    prefersPlaybooks?: boolean;
    maxRecommendations?: number;
    excludedRules?: string[];
  },
): PlateauRecommendation[] {
  let filtered = [...recommendations];

  // Filter by playbook preference
  if (preferences.prefersPlaybooks === true) {
    filtered = filtered.filter((r) => r.playbookCTA);
  }

  // Filter by excluded rules
  if (preferences.excludedRules) {
    filtered = filtered.filter(
      (r) => !preferences.excludedRules!.includes(r.rule),
    );
  }

  // Limit by max recommendations
  if (preferences.maxRecommendations) {
    filtered = filtered.slice(0, preferences.maxRecommendations);
  }

  return filtered;
}
