/**
 * Algorithmic Playbook Planner
 *
 * Generates formula-based training plans using standard progressive overload principles
 * for comparison with AI-generated plans. Implements common periodization models:
 * - Linear Periodization
 * - Daily Undulating Periodization (DUP)
 * - Block Periodization
 */

import { calculateOneRM } from "./exercise-calculations";
import type {
  WeeklyAlgorithmicPlan,
  SessionPrescription,
  ExercisePrescription,
} from "../schemas/playbook";
import type { PlaybookGenerationContext } from "../types/playbook";

// Standard progression rates
const PROGRESSION_RATES = {
  LINEAR_KG: 2.5, // 2.5kg per week for linear progression
  LINEAR_PERCENTAGE: 0.025, // 2.5% per week
  DELOAD_MULTIPLIER: 0.65, // 65% volume for deload weeks
} as const;

// Standard set/rep schemes for different goals
const SET_REP_SCHEMES = {
  strength: { sets: 5, reps: 5, intensityPercent: 0.8 }, // 5x5 @ 80% 1RM
  hypertrophy: { sets: 4, reps: 10, intensityPercent: 0.7 }, // 4x10 @ 70% 1RM
  power: { sets: 5, reps: 3, intensityPercent: 0.85 }, // 5x3 @ 85% 1RM
  deload: { sets: 3, reps: 5, intensityPercent: 0.6 }, // 3x5 @ 60% 1RM
};

/**
 * Calculate weight from 1RM and percentage
 */
function calculateWeight(oneRM: number, percentage: number, incrementKg = 2.5): number {
  const raw = oneRM * percentage;
  // Round to nearest increment
  return Math.round(raw / incrementKg) * incrementKg;
}

/**
 * Generate linear periodization plan
 * Week 1-3: Volume (3x8-10 @ 70-75%)
 * Week 4: Deload (3x5 @ 60%)
 * Week 5-6: Intensity (5x3-5 @ 80-85%)
 */
function generateLinearPlan(
  context: PlaybookGenerationContext,
  duration: number
): WeeklyAlgorithmicPlan[] {
  const weeks: WeeklyAlgorithmicPlan[] = [];
  const { currentOneRmEstimates, preferences } = context;
  const trainingDaysPerWeek = preferences.trainingDaysPerWeek ?? 3;

  // Get exercise list from context (simplified - would need to resolve from targetIds)
  const exercises = Object.keys(currentOneRmEstimates);

  for (let weekNum = 1; weekNum <= duration; weekNum++) {
    let weekType: "training" | "deload" | "pr_attempt" = "training";
    let scheme = SET_REP_SCHEMES.strength;
    let intensityMultiplier = 1.0;

    // Determine week type and scheme
    if (weekNum === 4 && duration >= 4) {
      weekType = "deload";
      scheme = SET_REP_SCHEMES.deload;
    } else if (weekNum === duration) {
      weekType = "pr_attempt";
      scheme = SET_REP_SCHEMES.power;
      intensityMultiplier = 1.05; // Attempt 105% of baseline
    } else if (weekNum <= 3) {
      // Volume phase
      scheme = { sets: 3, reps: 10, intensityPercent: 0.7 + (weekNum - 1) * 0.025 };
    } else {
      // Intensity phase
      scheme = { sets: 5, reps: 5, intensityPercent: 0.8 + (weekNum - 4) * 0.025 };
    }

    const sessions: SessionPrescription[] = [];

    // Generate sessions for the week
    for (let sessionNum = 1; sessionNum <= trainingDaysPerWeek; sessionNum++) {
      const sessionExercises: ExercisePrescription[] = [];

      // Rotate exercises across sessions
      const exercisesThisSession = exercises.filter((_, idx) => idx % trainingDaysPerWeek === sessionNum - 1);

      for (const exerciseName of exercisesThisSession) {
        const oneRM = currentOneRmEstimates[exerciseName] ?? 100; // Default 100kg if unknown
        const weight = calculateWeight(
          oneRM,
          scheme.intensityPercent * intensityMultiplier
        );

        sessionExercises.push({
          exerciseName,
          sets: scheme.sets,
          reps: scheme.reps,
          weight,
          restSeconds: scheme.intensityPercent > 0.75 ? 180 : 90, // 3min for heavy, 90s for lighter
          rpe: Math.round(scheme.intensityPercent * 10),
          notes: weekType === "pr_attempt" ? "Attempt PR - go for max" : undefined,
        });
      }

      const totalVolume = sessionExercises.reduce((sum, ex) => {
        return sum + (ex.sets * ex.reps * (ex.weight ?? 0));
      }, 0);

      sessions.push({
        sessionNumber: sessionNum,
        exercises: sessionExercises,
        totalVolumeTarget: totalVolume,
        estimatedDurationMinutes: sessionExercises.length * 15, // ~15min per exercise
      });
    }

    const weekVolume = sessions.reduce((sum, s) => sum + (s.totalVolumeTarget ?? 0), 0);

    weeks.push({
      weekNumber: weekNum,
      weekType,
      sessions,
      volumeTarget: weekVolume,
      progressionFormula: weekType === "deload"
        ? "deload_65%"
        : `linear_${scheme.intensityPercent * 100}%`,
    });
  }

  return weeks;
}

/**
 * Generate Daily Undulating Periodization (DUP) plan
 * Varies intensity and volume daily within each week
 * Example: Heavy day (85% 5x3), Medium day (75% 4x6), Light day (65% 3x10)
 */
function generateDUPPlan(
  context: PlaybookGenerationContext,
  duration: number
): WeeklyAlgorithmicPlan[] {
  const weeks: WeeklyAlgorithmicPlan[] = [];
  const { currentOneRmEstimates, preferences } = context;
  const trainingDaysPerWeek = Math.min(preferences.trainingDaysPerWeek ?? 3, 3); // DUP works best with 3 days

  const exercises = Object.keys(currentOneRmEstimates);

  // DUP intensity cycles
  const dupCycles = [
    { name: "heavy", sets: 5, reps: 3, intensityPercent: 0.85, rest: 240 },
    { name: "medium", sets: 4, reps: 6, intensityPercent: 0.75, rest: 120 },
    { name: "light", sets: 3, reps: 10, intensityPercent: 0.65, rest: 90 },
  ];

  for (let weekNum = 1; weekNum <= duration; weekNum++) {
    let weekType: "training" | "deload" | "pr_attempt" = "training";

    // Deload week 4
    if (weekNum === 4 && duration >= 4) {
      weekType = "deload";
    } else if (weekNum === duration) {
      weekType = "pr_attempt";
    }

    const sessions: SessionPrescription[] = [];

    for (let sessionNum = 1; sessionNum <= trainingDaysPerWeek; sessionNum++) {
      const cycle = dupCycles[(sessionNum - 1) % dupCycles.length];
      const sessionExercises: ExercisePrescription[] = [];

      let scheme = cycle;
      if (weekType === "deload") {
        scheme = { ...cycle, sets: 2, intensityPercent: cycle.intensityPercent! * 0.7 };
      } else if (weekType === "pr_attempt" && sessionNum === 1) {
        // First session of PR week is max attempt
        scheme = { name: "max", sets: 5, reps: 1, intensityPercent: 0.95, rest: 300 };
      }

      for (const exerciseName of exercises) {
        const oneRM = currentOneRmEstimates[exerciseName] ?? 100;
        // Progressive overload: add 2.5% per week
        const progressionMultiplier = 1 + (weekNum - 1) * PROGRESSION_RATES.LINEAR_PERCENTAGE;
        const weight = calculateWeight(
          oneRM * progressionMultiplier,
          scheme.intensityPercent!
        );

        sessionExercises.push({
          exerciseName,
          sets: scheme.sets,
          reps: scheme.reps,
          weight,
          restSeconds: scheme.rest,
          rpe: Math.round(scheme.intensityPercent! * 10),
        });
      }

      const totalVolume = sessionExercises.reduce((sum, ex) => {
        return sum + (ex.sets * ex.reps * (ex.weight ?? 0));
      }, 0);

      sessions.push({
        sessionNumber: sessionNum,
        dayOfWeek: ["Monday", "Wednesday", "Friday"][sessionNum - 1],
        exercises: sessionExercises,
        totalVolumeTarget: totalVolume,
        notes: `DUP ${cycle?.name ?? 'max'} day`,
      });
    }

    const weekVolume = sessions.reduce((sum, s) => sum + (s.totalVolumeTarget ?? 0), 0);

    weeks.push({
      weekNumber: weekNum,
      weekType,
      sessions,
      volumeTarget: weekVolume,
      progressionFormula: `DUP_week${weekNum}_${weekType}`,
    });
  }

  return weeks;
}

/**
 * Generate Block Periodization plan
 * Weeks 1-2: Accumulation (high volume, 70-75%)
 * Weeks 3-4: Intensification (medium volume, 80-85%)
 * Weeks 5-6: Realization (low volume, 90-95% + PR)
 */
function generateBlockPlan(
  context: PlaybookGenerationContext,
  duration: number
): WeeklyAlgorithmicPlan[] {
  const weeks: WeeklyAlgorithmicPlan[] = [];
  const { currentOneRmEstimates, preferences } = context;
  const trainingDaysPerWeek = preferences.trainingDaysPerWeek ?? 3;
  const exercises = Object.keys(currentOneRmEstimates);

  for (let weekNum = 1; weekNum <= duration; weekNum++) {
    let weekType: "training" | "deload" | "pr_attempt" = "training";
    let blockPhase: "accumulation" | "intensification" | "realization";
    let scheme: { sets: number; reps: number; intensityPercent: number };

    // Determine block phase
    if (weekNum <= 2) {
      blockPhase = "accumulation";
      scheme = { sets: 4, reps: 10, intensityPercent: 0.7 };
    } else if (weekNum <= 4) {
      blockPhase = "intensification";
      scheme = { sets: 5, reps: 5, intensityPercent: 0.82 };
    } else {
      blockPhase = "realization";
      scheme = { sets: 3, reps: 3, intensityPercent: 0.9 };
      weekType = weekNum === duration ? "pr_attempt" : "training";
    }

    const sessions: SessionPrescription[] = [];

    for (let sessionNum = 1; sessionNum <= trainingDaysPerWeek; sessionNum++) {
      const sessionExercises: ExercisePrescription[] = [];

      for (const exerciseName of exercises) {
        const oneRM = currentOneRmEstimates[exerciseName] ?? 100;
        const weight = calculateWeight(oneRM, scheme.intensityPercent);

        sessionExercises.push({
          exerciseName,
          sets: scheme.sets,
          reps: scheme.reps,
          weight,
          restSeconds: scheme.intensityPercent > 0.8 ? 180 : 90,
          rpe: Math.round(scheme.intensityPercent * 10),
          notes: blockPhase === "realization" ? "Realization phase - focus on heavy singles" : undefined,
        });
      }

      const totalVolume = sessionExercises.reduce((sum, ex) => {
        return sum + (ex.sets * ex.reps * (ex.weight ?? 0));
      }, 0);

      sessions.push({
        sessionNumber: sessionNum,
        exercises: sessionExercises,
        totalVolumeTarget: totalVolume,
      });
    }

    const weekVolume = sessions.reduce((sum, s) => sum + (s.totalVolumeTarget ?? 0), 0);

    weeks.push({
      weekNumber: weekNum,
      weekType,
      sessions,
      volumeTarget: weekVolume,
      progressionFormula: `block_${blockPhase}`,
    });
  }

  return weeks;
}

/**
 * Main function to generate algorithmic playbook plan
 * Chooses periodization model based on user experience and goal
 */
export function generateAlgorithmicPlan(
  context: PlaybookGenerationContext
): WeeklyAlgorithmicPlan[] {
  const { duration, goalPreset, recentSessions } = context;

  // Choose periodization model based on experience and goal
  const sessionCount = recentSessions.length;
  const isExperienced = sessionCount >= 12;

  let periodizationModel: "linear" | "dup" | "block";

  if (goalPreset === "powerlifting" || goalPreset === "peaking") {
    periodizationModel = "block"; // Block is best for peaking
  } else if (isExperienced && (goalPreset === "strength" || goalPreset === "hypertrophy")) {
    periodizationModel = "dup"; // DUP for experienced lifters
  } else {
    periodizationModel = "linear"; // Linear for beginners or general training
  }

  switch (periodizationModel) {
    case "linear":
      return generateLinearPlan(context, duration);
    case "dup":
      return generateDUPPlan(context, duration);
    case "block":
      return generateBlockPlan(context, duration);
    default:
      return generateLinearPlan(context, duration);
  }
}

/**
 * Calculate total volume for a week
 */
export function calculateWeekVolume(week: WeeklyAlgorithmicPlan): number {
  return week.sessions.reduce((sum, session) => {
    return sum + (session.totalVolumeTarget ?? 0);
  }, 0);
}

/**
 * Estimate 1RM from training prescription
 * Useful for validating progression
 */
export function estimateOneRMFromPrescription(
  weight: number,
  reps: number
): number {
  return calculateOneRM(weight, reps);
}
