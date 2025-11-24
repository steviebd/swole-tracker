import { sql } from "drizzle-orm";
import type { db } from "~/server/db";
import { milestones } from "~/server/db/schema";
import type {
  Milestone,
  MilestoneGenerationContext,
} from "~/server/api/types/plateau-milestone";
import type {
  ExperienceLevel,
  MilestoneType,
} from "~/server/api/schemas/plateau-milestone";

/**
 * Generate default milestones for a user based on experience level and bodyweight
 *
 * Creates realistic strength milestones using established strength standards
 * (e.g., 1x, 1.5x, 2x bodyweight for major lifts)
 *
 * @param database - Database instance
 * @param context - Milestone generation context
 * @returns Generated milestones
 */
export async function generateDefaultMilestones(
  database: typeof db,
  context: MilestoneGenerationContext,
): Promise<Milestone[]> {
  const { userId, experienceLevel, bodyweight } = context;

  // Define milestone targets based on experience level and bodyweight
  const milestoneTargets = getMilestoneTargets(experienceLevel, bodyweight);

  const generatedMilestones: Milestone[] = [];

  // Generate milestones for each major lift category
  for (const [exerciseName, targets] of Object.entries(milestoneTargets)) {
    // Get master exercise ID for this exercise
    const masterExerciseId = await getMasterExerciseId(database, exerciseName);

    if (!masterExerciseId) continue; // Skip if exercise not found

    // Create milestones for each target
    for (const target of targets) {
      const milestone: Milestone = {
        id: 0, // Will be set when stored
        userId,
        masterExerciseId,
        type: target.type,
        targetValue: target.value,
        targetMultiplier: target.multiplier || null,
        isSystemDefault: true,
        isCustomized: false,
        experienceLevel,
        createdAt: new Date(),
      };

      generatedMilestones.push(milestone);
    }
  }

  return generatedMilestones;
}

/**
 * Store generated milestones in database
 */
export async function storeMilestones(
  database: typeof db,
  userId: string,
  milestonesData: Milestone[],
): Promise<number[]> {
  const insertedIds: number[] = [];

  for (const milestone of milestonesData) {
    // Check if milestone already exists
    const existing = await database
      .select()
      .from(milestones)
      .where(
        sql`${milestones.userId} = ${userId} AND 
           ${milestones.masterExerciseId} = ${milestone.masterExerciseId} AND
           ${milestones.type} = ${milestone.type} AND
           ${milestones.targetValue} = ${milestone.targetValue}`,
      )
      .limit(1);

    if (existing.length === 0) {
      const result = await database
        .insert(milestones)
        .values({
          userId,
          masterExerciseId: milestone.masterExerciseId,
          type: milestone.type,
          targetValue: milestone.targetValue,
          targetMultiplier: milestone.targetMultiplier,
          isSystemDefault: milestone.isSystemDefault,
          isCustomized: milestone.isCustomized,
          experienceLevel: milestone.experienceLevel,
        })
        .returning({ id: milestones.id });

      insertedIds.push(result[0]!.id);
    }
  }

  return insertedIds;
}

/**
 * Get milestone targets based on experience level and bodyweight
 */
function getMilestoneTargets(
  experienceLevel: ExperienceLevel,
  bodyweight?: number,
): Record<
  string,
  Array<{
    type: MilestoneType;
    value: number;
    multiplier?: number;
  }>
> {
  const baseBodyweight = bodyweight || 150; // Default to 150lbs if not provided

  // Define milestone targets for major compound lifts
  const targets: Record<
    string,
    Array<{
      type: MilestoneType;
      value: number;
      multiplier?: number;
    }>
  > = {};

  // Squat milestones
  targets["Squat"] = [
    { type: "bodyweight_multiplier", value: 1, multiplier: 1 }, // 1x bodyweight
    { type: "bodyweight_multiplier", value: 1.5, multiplier: 1.5 }, // 1.5x bodyweight
    { type: "bodyweight_multiplier", value: 2, multiplier: 2 }, // 2x bodyweight
    { type: "absolute_weight", value: baseBodyweight }, // 10 reps at bodyweight
    { type: "absolute_weight", value: baseBodyweight * 0.5 }, // 20 reps at bodyweight
  ];

  // Deadlift milestones
  targets["Deadlift"] = [
    { type: "bodyweight_multiplier", value: 1.5, multiplier: 1.5 }, // 1.5x bodyweight
    { type: "bodyweight_multiplier", value: 2, multiplier: 2 }, // 2x bodyweight
    { type: "bodyweight_multiplier", value: 2.5, multiplier: 2.5 }, // 2.5x bodyweight
    { type: "absolute_weight", value: baseBodyweight * 2 }, // 5 reps at 2x bodyweight
    { type: "absolute_weight", value: baseBodyweight * 1.5 }, // 10 reps at 1.5x bodyweight
  ];

  // Bench Press milestones
  targets["Bench Press"] = [
    { type: "bodyweight_multiplier", value: 0.75, multiplier: 0.75 }, // 0.75x bodyweight
    { type: "bodyweight_multiplier", value: 1, multiplier: 1 }, // 1x bodyweight
    { type: "bodyweight_multiplier", value: 1.25, multiplier: 1.25 }, // 1.25x bodyweight
    { type: "absolute_weight", value: baseBodyweight * 0.75 }, // 10 reps at 0.75x bodyweight
    { type: "absolute_weight", value: baseBodyweight * 0.5 }, // 20 reps at 0.5x bodyweight
  ];

  // Overhead Press milestones
  targets["Overhead Press"] = [
    { type: "bodyweight_multiplier", value: 0.5, multiplier: 0.5 }, // 0.5x bodyweight
    { type: "bodyweight_multiplier", value: 0.75, multiplier: 0.75 }, // 0.75x bodyweight
    { type: "bodyweight_multiplier", value: 1, multiplier: 1 }, // 1x bodyweight
    { type: "absolute_weight", value: baseBodyweight * 0.75 }, // 5 reps at 0.75x bodyweight
    { type: "absolute_weight", value: baseBodyweight * 0.5 }, // 10 reps at 0.5x bodyweight
  ];

  // Barbell Row milestones
  targets["Barbell Row"] = [
    { type: "bodyweight_multiplier", value: 0.75, multiplier: 0.75 }, // 0.75x bodyweight
    { type: "bodyweight_multiplier", value: 1, multiplier: 1 }, // 1x bodyweight
    { type: "bodyweight_multiplier", value: 1.25, multiplier: 1.25 }, // 1.25x bodyweight
    { type: "absolute_weight", value: baseBodyweight }, // 8 reps at bodyweight
    { type: "absolute_weight", value: baseBodyweight * 0.75 }, // 15 reps at 0.75x bodyweight
  ];

  // Adjust targets based on experience level
  return adjustTargetsForExperienceLevel(targets, experienceLevel);
}

/**
 * Adjust milestone targets based on experience level
 */
function adjustTargetsForExperienceLevel(
  targets: Record<
    string,
    Array<{
      type: MilestoneType;
      value: number;
      multiplier?: number;
    }>
  >,
  experienceLevel: ExperienceLevel,
): Record<
  string,
  Array<{
    type: MilestoneType;
    value: number;
    multiplier?: number;
  }>
> {
  const adjustedTargets = { ...targets };

  switch (experienceLevel) {
    case "beginner":
      // For beginners, focus on foundational milestones
      Object.keys(adjustedTargets).forEach((exercise) => {
        const milestones = adjustedTargets[exercise];
        if (milestones) {
          adjustedTargets[exercise] = milestones.slice(0, 2); // Keep first 2 milestones
        }
      });
      break;

    case "intermediate":
      // For intermediate, include most milestones
      Object.keys(adjustedTargets).forEach((exercise) => {
        const milestones = adjustedTargets[exercise];
        if (milestones) {
          adjustedTargets[exercise] = milestones.slice(0, 3); // Keep first 3 milestones
        }
      });
      break;

    case "advanced":
      // For advanced, include all milestones
      // No adjustment needed
      break;
  }

  return adjustedTargets;
}

/**
 * Get master exercise ID by exercise name
 */
async function getMasterExerciseId(
  database: typeof db,
  exerciseName: string,
): Promise<number | null> {
  // This would typically query masterExercises table
  // For now, return a mock implementation
  const exerciseMap: Record<string, number> = {
    Squat: 1,
    Deadlift: 2,
    "Bench Press": 3,
    "Overhead Press": 4,
    "Barbell Row": 5,
  };

  return exerciseMap[exerciseName] || null;
}

/**
 * Generate custom milestone for user
 */
export async function generateCustomMilestone(
  database: typeof db,
  userId: string,
  masterExerciseId: number,
  type: MilestoneType,
  targetValue: number,
  experienceLevel: ExperienceLevel,
): Promise<Milestone> {
  return {
    id: 0, // Will be set when stored
    userId,
    masterExerciseId,
    type,
    targetValue,
    targetMultiplier: null, // Custom milestones don't use multipliers
    isSystemDefault: false,
    isCustomized: true,
    experienceLevel,
    createdAt: new Date(),
  };
}

/**
 * Get milestone suggestions based on user's current performance
 */
export async function getMilestoneSuggestions(
  database: typeof db,
  context: MilestoneGenerationContext,
): Promise<Milestone[]> {
  const { userId, experienceLevel, currentStats } = context;

  if (!currentStats) {
    return [];
  }

  const suggestions: Milestone[] = [];
  const { currentOneRM, bestWeight } = currentStats;

  // Suggest next logical milestones based on current performance
  if (currentOneRM > 0) {
    // Suggest 10% increase milestone
    const nextWeightMilestone = await generateCustomMilestone(
      database,
      userId,
      context.masterExerciseId || 0,
      "absolute_weight",
      Math.ceil((currentOneRM * 1.1) / 5) * 5, // Round to nearest 5lbs
      experienceLevel,
    );
    suggestions.push(nextWeightMilestone);
  }

  if (bestWeight > 0) {
    // Suggest volume milestone at current best weight
    const nextVolumeMilestone = await generateCustomMilestone(
      database,
      userId,
      context.masterExerciseId || 0,
      "volume",
      bestWeight * 10, // Target 10x current best weight in volume
      experienceLevel,
    );
    suggestions.push(nextVolumeMilestone);
  }

  return suggestions;
}

/**
 * Calculate milestone progress percentage
 */
export function calculateMilestoneProgress(
  currentValue: number,
  targetValue: number,
  type: MilestoneType,
): number {
  if (targetValue <= 0) return 0;

  const progress = Math.min(100, (currentValue / targetValue) * 100);
  return Math.round(progress * 100) / 100; // Round to 2 decimal places
}

/**
 * Get milestone difficulty description
 */
export function getMilestoneDifficulty(
  milestone: Milestone,
  experienceLevel: ExperienceLevel,
): "easy" | "moderate" | "challenging" | "advanced" {
  // This would typically use more sophisticated logic
  // For now, use a simple heuristic based on target values

  if (milestone.type === "absolute_weight") {
    // For absolute weight targets, consider experience level
    switch (experienceLevel) {
      case "beginner":
        return milestone.targetValue <= 135
          ? "easy"
          : milestone.targetValue <= 185
            ? "moderate"
            : "challenging";
      case "intermediate":
        return milestone.targetValue <= 185
          ? "easy"
          : milestone.targetValue <= 225
            ? "moderate"
            : "challenging";
      case "advanced":
        return milestone.targetValue <= 225
          ? "easy"
          : milestone.targetValue <= 315
            ? "moderate"
            : "challenging";
    }
  }

  if (milestone.type === "bodyweight_multiplier") {
    if (milestone.targetMultiplier) {
      if (milestone.targetMultiplier <= 0.75) return "easy";
      if (milestone.targetMultiplier <= 1) return "moderate";
      if (milestone.targetMultiplier <= 1.5) return "challenging";
      return "advanced";
    }
  }

  // For volume milestones
  if (milestone.type === "volume") {
    if (milestone.targetValue <= 1000) return "easy";
    if (milestone.targetValue <= 2500) return "moderate";
    if (milestone.targetValue <= 5000) return "challenging";
    return "advanced";
  }

  return "moderate";
}
