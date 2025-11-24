import type {
  RecoveryData,
  RecoveryPlannerRequest,
  RecoveryPlannerResponse,
  RecoveryPlannerStrategy,
  RecommendationType,
  StrategyMultipliers,
  RecoveryThresholds,
} from "~/server/api/types/recovery-planner";

interface SetData {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  sets: number;
  unit: "kg" | "lbs";
  rpe?: number;
  rest?: number;
  notes?: string;
  distance?: number;
  time?: number;
  setType?: "warmup" | "working" | "backoff" | "drop";
  originalWeight?: number; // Added for recovery planner
}

interface ExerciseData {
  templateExerciseId?: number;
  exerciseName: string;
  sets: SetData[];
  unit: "kg" | "lbs";
  originalSetCount?: number; // Added for recovery planner
}

// Strategy configuration for different recovery planner strategies
const STRATEGY_MULTIPLIERS: StrategyMultipliers = {
  conservative: {
    redZoneIntensity: 0.6, // 40% reduction
    redZoneVolume: 0.5, // 50% reduction
    yellowZoneIntensity: 0.8, // 20% reduction
    yellowZoneVolume: 0.7, // 30% reduction
  },
  moderate: {
    redZoneIntensity: 0.7, // 30% reduction
    redZoneVolume: 0.6, // 40% reduction
    yellowZoneIntensity: 0.85, // 15% reduction
    yellowZoneVolume: 0.8, // 20% reduction
  },
  adaptive: {
    redZoneIntensity: 0.75, // 25% reduction
    redZoneVolume: 0.65, // 35% reduction
    yellowZoneIntensity: 0.9, // 10% reduction
    yellowZoneVolume: 0.85, // 15% reduction
  },
  aggressive: {
    redZoneIntensity: 0.8, // 20% reduction
    redZoneVolume: 0.7, // 30% reduction
    yellowZoneIntensity: 0.95, // 5% reduction
    yellowZoneVolume: 0.9, // 10% reduction
  },
};

// Recovery thresholds based on readiness score (0-1)
const RECOVERY_THRESHOLDS: RecoveryThresholds = {
  redZone: 0.33, // Below 33%: Strong recommendation to reduce or rest
  yellowZone: 0.66, // Below 66%: Consider reducing intensity/volume
  greenZone: 1.0, // Above 66%: Train as planned
};

/**
 * Calculate readiness score from multiple recovery metrics
 */
function calculateReadinessScore(recoveryData: RecoveryData): number {
  const { recoveryScore, sleepPerformance, hrvStatus, rhrStatus } =
    recoveryData;

  let score = 0.5; // Default to neutral
  let components = 0;

  // WHOOP Recovery Score (40% weight)
  if (recoveryScore !== null && recoveryScore !== undefined) {
    score += (recoveryScore / 100) * 0.4;
    components++;
  }

  // Sleep Performance (30% weight)
  if (sleepPerformance !== null && sleepPerformance !== undefined) {
    score += (sleepPerformance / 100) * 0.3;
    components++;
  }

  // HRV Status (20% weight)
  if (hrvStatus) {
    switch (hrvStatus) {
      case "high":
        score += 0.9 * 0.2;
        break;
      case "baseline":
        score += 0.8 * 0.2;
        break;
      case "low":
        score += 0.6 * 0.2;
        break;
    }
    components++;
  }

  // RHR Status (10% weight)
  if (rhrStatus) {
    switch (rhrStatus) {
      case "optimal":
        score += 0.9 * 0.1;
        break;
      case "baseline":
        score += 0.8 * 0.1;
        break;
      case "elevated":
        score += 0.6 * 0.1;
        break;
    }
    components++;
  }

  // If we have no data, return neutral
  return components === 0 ? 0.5 : Math.min(1.0, Math.max(0.0, score));
}

/**
 * Determine recommendation based on readiness score and strategy
 */
function determineRecommendation(
  readinessScore: number,
  strategy: RecoveryPlannerStrategy,
  sensitivity: number,
): {
  recommendation: RecommendationType;
  intensityAdjustment: number;
  volumeAdjustment: number;
  confidence: number;
} {
  const multipliers = STRATEGY_MULTIPLIERS[strategy];

  // Adjust thresholds based on user sensitivity (1-10 scale)
  // Higher sensitivity = more conservative recommendations
  const sensitivityFactor = (sensitivity - 5) / 10; // -0.5 to +0.5
  const adjustedRedZone = RECOVERY_THRESHOLDS.redZone - sensitivityFactor * 0.1;
  const adjustedYellowZone =
    RECOVERY_THRESHOLDS.yellowZone - sensitivityFactor * 0.1;

  if (readinessScore < adjustedRedZone) {
    // Red zone: Strong recommendation to reduce or rest
    return {
      recommendation: readinessScore < 0.2 ? "rest_day" : "active_recovery",
      intensityAdjustment: multipliers.redZoneIntensity,
      volumeAdjustment: multipliers.redZoneVolume,
      confidence: 0.9,
    };
  } else if (readinessScore < adjustedYellowZone) {
    // Yellow zone: Moderate reduction
    return {
      recommendation: "reduce_intensity",
      intensityAdjustment: multipliers.yellowZoneIntensity,
      volumeAdjustment: multipliers.yellowZoneVolume,
      confidence: 0.8,
    };
  } else {
    // Green zone: Train as planned
    return {
      recommendation: "train_as_planned",
      intensityAdjustment: 1.0,
      volumeAdjustment: 1.0,
      confidence: 0.7,
    };
  }
}

/**
 * Generate reasoning based on recovery data and recommendation
 */
function generateReasoning(
  recoveryData: RecoveryData,
  readinessScore: number,
  recommendation: RecommendationType,
  strategy: RecoveryPlannerStrategy,
): string {
  const { recoveryScore, sleepPerformance, hrvStatus, rhrStatus } =
    recoveryData;

  const reasons: string[] = [];

  // Add specific data points
  if (recoveryScore !== null && recoveryScore !== undefined) {
    if (recoveryScore >= 80) {
      reasons.push(`WHOOP recovery is excellent (${recoveryScore}%)`);
    } else if (recoveryScore >= 60) {
      reasons.push(`WHOOP recovery is good (${recoveryScore}%)`);
    } else if (recoveryScore >= 40) {
      reasons.push(`WHOOP recovery is moderate (${recoveryScore}%)`);
    } else {
      reasons.push(`WHOOP recovery is low (${recoveryScore}%)`);
    }
  }

  if (sleepPerformance !== null && sleepPerformance !== undefined) {
    if (sleepPerformance >= 85) {
      reasons.push(`sleep quality is excellent (${sleepPerformance}%)`);
    } else if (sleepPerformance >= 70) {
      reasons.push(`sleep quality is good (${sleepPerformance}%)`);
    } else if (sleepPerformance >= 50) {
      reasons.push(`sleep quality is moderate (${sleepPerformance}%)`);
    } else {
      reasons.push(`sleep quality is poor (${sleepPerformance}%)`);
    }
  }

  if (hrvStatus) {
    switch (hrvStatus) {
      case "high":
        reasons.push("HRV is above baseline (good sign)");
        break;
      case "baseline":
        reasons.push("HRV is at normal baseline");
        break;
      case "low":
        reasons.push("HRV is below baseline (sign of stress)");
        break;
    }
  }

  if (rhrStatus) {
    switch (rhrStatus) {
      case "optimal":
        reasons.push("resting heart rate is optimal");
        break;
      case "baseline":
        reasons.push("resting heart rate is at normal baseline");
        break;
      case "elevated":
        reasons.push("resting heart rate is elevated (sign of fatigue)");
        break;
    }
  }

  // Add recommendation-specific reasoning
  switch (recommendation) {
    case "rest_day":
      reasons.push(
        "Based on your recovery metrics, a rest day is recommended to allow for full recovery",
      );
      break;
    case "active_recovery":
      reasons.push(
        "Light activity or active recovery is recommended to promote blood flow without additional stress",
      );
      break;
    case "reduce_intensity":
      reasons.push(
        `Consider reducing intensity by ${Math.round((1 - STRATEGY_MULTIPLIERS[strategy].yellowZoneIntensity) * 100)}% and volume by ${Math.round((1 - STRATEGY_MULTIPLIERS[strategy].yellowZoneVolume) * 100)}%`,
      );
      break;
    case "reduce_volume":
      reasons.push(
        `Consider reducing training volume by ${Math.round((1 - STRATEGY_MULTIPLIERS[strategy].yellowZoneVolume) * 100)}% while maintaining intensity`,
      );
      break;
    case "train_as_planned":
      reasons.push("Your recovery indicators support training as planned");
      break;
  }

  return reasons.join(". ");
}

/**
 * Generate specific exercise modifications based on adjustments
 */
function generateSuggestedModifications(
  plannedWorkout: Record<string, any>,
  intensityAdjustment: number,
  volumeAdjustment: number,
): Record<string, any> | undefined {
  const modifications: Record<string, any> = {};

  if (
    !plannedWorkout["exercises"] ||
    !Array.isArray(plannedWorkout["exercises"])
  ) {
    return undefined;
  }

  modifications["exercises"] = plannedWorkout["exercises"].map(
    (exercise: ExerciseData) => {
      const modifiedExercise = { ...exercise };

      // Adjust weights for intensity
      if (exercise.sets && Array.isArray(exercise.sets)) {
        modifiedExercise.sets = exercise.sets.map((set: SetData) => {
          const modifiedSet = { ...set };

          if (set.weight && intensityAdjustment !== 1.0) {
            modifiedSet.weight =
              Math.round(set.weight * intensityAdjustment * 10) / 10; // Round to 1 decimal
            modifiedSet.originalWeight = set.weight; // Keep original for reference
          }

          return modifiedSet;
        });
      }

      // Adjust volume (sets) if needed
      if (
        volumeAdjustment !== 1.0 &&
        exercise.sets &&
        Array.isArray(exercise.sets)
      ) {
        const originalSetCount = exercise.sets.length;
        const targetSetCount = Math.max(
          1,
          Math.round(originalSetCount * volumeAdjustment),
        );

        if (targetSetCount !== originalSetCount) {
          modifiedExercise.originalSetCount = originalSetCount;
          modifiedExercise.sets = exercise.sets.slice(0, targetSetCount);
        }
      }

      return modifiedExercise;
    },
  );

  return modifications;
}

/**
 * Main session planner algorithm
 */
export function generateSessionPlannerRecommendation(
  request: RecoveryPlannerRequest,
): RecoveryPlannerResponse {
  const { recoveryData, userPreferences, plannedWorkout } = request;
  const { recoveryPlannerStrategy, recoveryPlannerSensitivity } =
    userPreferences;

  // Calculate composite readiness score
  const readinessScore = calculateReadinessScore(recoveryData);

  // Determine recommendation and adjustments
  const { recommendation, intensityAdjustment, volumeAdjustment, confidence } =
    determineRecommendation(
      readinessScore,
      recoveryPlannerStrategy,
      recoveryPlannerSensitivity,
    );

  // Generate reasoning
  const reasoning = generateReasoning(
    recoveryData,
    readinessScore,
    recommendation,
    recoveryPlannerStrategy,
  );

  // Generate specific modifications if adjustments are needed
  const suggestedModifications =
    intensityAdjustment !== 1.0 || volumeAdjustment !== 1.0
      ? generateSuggestedModifications(
          plannedWorkout,
          intensityAdjustment,
          volumeAdjustment,
        )
      : undefined;

  return {
    recommendation,
    intensityAdjustment,
    volumeAdjustment,
    suggestedModifications: suggestedModifications || {},
    reasoning,
    confidence,
  };
}

/**
 * Validate recovery data completeness and quality
 */
export function validateRecoveryData(recoveryData: RecoveryData): {
  isValid: boolean;
  quality: "excellent" | "good" | "fair" | "poor";
  missingFields: string[];
} {
  const missingFields: string[] = [];
  let dataPoints = 0;

  if (
    recoveryData.recoveryScore !== null &&
    recoveryData.recoveryScore !== undefined
  ) {
    dataPoints++;
  } else {
    missingFields.push("recoveryScore");
  }

  if (
    recoveryData.sleepPerformance !== null &&
    recoveryData.sleepPerformance !== undefined
  ) {
    dataPoints++;
  } else {
    missingFields.push("sleepPerformance");
  }

  if (recoveryData.hrvStatus) {
    dataPoints++;
  } else {
    missingFields.push("hrvStatus");
  }

  if (recoveryData.rhrStatus) {
    dataPoints++;
  } else {
    missingFields.push("rhrStatus");
  }

  let quality: "excellent" | "good" | "fair" | "poor" = "poor";
  if (dataPoints === 4) quality = "excellent";
  else if (dataPoints === 3) quality = "good";
  else if (dataPoints === 2) quality = "fair";

  return {
    isValid: dataPoints >= 2, // At least 2 data points required
    quality,
    missingFields,
  };
}
