import { eq, and, desc, sql } from "drizzle-orm";
import type { db } from "~/server/db";
import {
  sessionExercises,
  workoutSessions,
  templateExercises,
  exerciseLinks,
  prForecasts,
} from "~/server/db/schema";
import type {
  PRForecast,
  ForecastData,
  ForecastListResponse,
  PRForecastContext,
} from "~/server/api/types/plateau-milestone";
import type { ExperienceLevel } from "~/server/api/schemas/plateau-milestone";

// Internal type for forecast calculation
interface ForecastCalculation {
  currentPR: number;
  nextPRWeight: number;
  sessionsToNextPR: number;
  weeksToNextPR: number;
  velocity: number;
  confidence: number;
}

/**
 * Generate PR forecast for a specific exercise and user
 *
 * Uses historical progression data to predict when user might hit
 * their next personal record based on current training velocity
 *
 * @param database - Database instance
 * @param userId - User ID
 * @param masterExerciseId - Master exercise ID
 * @returns PR forecast with confidence levels
 */
export async function generatePRForecast(
  database: typeof db,
  userId: string,
  masterExerciseId: number,
): Promise<ForecastListResponse> {
  // Get historical performance data
  const historicalData = await getHistoricalPerformanceData(
    database,
    userId,
    masterExerciseId,
  );

  if (historicalData.length < 3) {
    return {
      forecasts: [],
      totalCount: 0,
      averageConfidence: 0,
    };
  }

  // Calculate current PR
  const validOneRMs = historicalData
    .map((d) => d.oneRMEstimate)
    .filter((rm): rm is number => rm !== null);

  if (validOneRMs.length === 0) {
    return {
      forecasts: [],
      totalCount: 0,
      averageConfidence: 0,
    };
  }

  const currentPR = Math.max(...validOneRMs);

  // Calculate progression velocity
  const velocity = calculateProgressionVelocity(historicalData);

  if (velocity <= 0) {
    return {
      forecasts: [],
      totalCount: 0,
      averageConfidence: 0,
    };
  }

  // Get user experience level for realistic expectations
  const experienceLevel = await getUserExperienceLevel(database, userId);

  // Calculate forecast
  const calculation = calculateForecast(
    currentPR,
    velocity,
    experienceLevel,
    historicalData,
  );

  // Create forecast data
  const forecastData: ForecastData = {
    exerciseName: "", // Will be filled by caller
    masterExerciseId,
    currentWeight: currentPR,
    forecastedWeight: calculation.nextPRWeight,
    estimatedWeeksLow: Math.max(1, calculation.weeksToNextPR - 1),
    estimatedWeeksHigh: calculation.weeksToNextPR + 1,
    confidencePercent: Math.round(calculation.confidence * 100),
    calculatedAt: new Date(),
    trajectory:
      calculation.velocity > 0.5
        ? "improving"
        : calculation.velocity > 0
          ? "stable"
          : "declining",
  };

  return {
    forecasts: [forecastData],
    totalCount: 1,
    averageConfidence: calculation.confidence,
  };
}

/**
 * Store PR forecast in database
 */
export async function storePRForecast(
  database: typeof db,
  userId: string,
  masterExerciseId: number,
  forecastData: ForecastData,
): Promise<number> {
  // Remove any existing forecast for this exercise
  await database
    .delete(prForecasts)
    .where(
      and(
        eq(prForecasts.userId, userId),
        eq(prForecasts.masterExerciseId, masterExerciseId),
      ),
    );

  // Insert new forecast
  const result = await database
    .insert(prForecasts)
    .values({
      userId,
      masterExerciseId,
      forecastedWeight: forecastData.forecastedWeight,
      estimatedWeeksLow: forecastData.estimatedWeeksLow,
      estimatedWeeksHigh: forecastData.estimatedWeeksHigh,
      confidencePercent: forecastData.confidencePercent,
      whoopRecoveryFactor: null, // TODO: Integrate WHOOP data
      metadata: JSON.stringify({
        trajectory: forecastData.trajectory,
        currentWeight: forecastData.currentWeight,
      }),
    })
    .returning({ id: prForecasts.id });

  return result[0]!.id;
}

/**
 * Get active PR forecasts for a user
 */
export async function getActivePRForecasts(
  database: typeof db,
  userId: string,
): Promise<PRForecast[]> {
  const forecasts = await database
    .select()
    .from(prForecasts)
    .where(eq(prForecasts.userId, userId))
    .orderBy(desc(prForecasts.confidencePercent));

  return forecasts.map((f) => ({
    id: f.id,
    userId: f.userId,
    masterExerciseId: f.masterExerciseId,
    forecastedWeight: f.forecastedWeight,
    estimatedWeeksLow: f.estimatedWeeksLow,
    estimatedWeeksHigh: f.estimatedWeeksHigh,
    confidencePercent: f.confidencePercent,
    whoopRecoveryFactor: f.whoopRecoveryFactor,
    calculatedAt: f.calculatedAt,
    metadata: f.metadata,
  }));
}

/**
 * Get historical performance data for an exercise
 */
async function getHistoricalPerformanceData(
  database: typeof db,
  userId: string,
  masterExerciseId: number,
) {
  // Use templateExerciseId to join to exerciseLinks and filter by masterExerciseId
  return await database
    .select({
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      workoutDate: workoutSessions.workoutDate,
      oneRMEstimate: sessionExercises.one_rm_estimate,
    })
    .from(sessionExercises)
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.id, sessionExercises.sessionId),
    )
    .innerJoin(
      exerciseLinks,
      eq(exerciseLinks.templateExerciseId, sessionExercises.templateExerciseId),
    )
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        eq(exerciseLinks.masterExerciseId, masterExerciseId),
      ),
    )
    .orderBy(desc(workoutSessions.workoutDate))
    .limit(20); // Last 20 sessions
}

/**
 * Calculate progression velocity (1RM increase per session)
 */
function calculateProgressionVelocity(
  historicalData: Array<{
    oneRMEstimate: number | null;
    workoutDate: Date;
  }>,
): number {
  const validData = historicalData.filter((d) => d.oneRMEstimate !== null);

  if (validData.length < 2) return 0;

  // Use linear regression on last 10 sessions
  const recentData = validData.slice(0, 10);
  const n = recentData.length;

  // Simple linear regression: y = mx + b
  // where x is session index (0 = most recent) and y is 1RM
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  recentData.forEach((data, index) => {
    const x = index; // 0 = most recent, 1 = previous, etc.
    const y = data.oneRMEstimate!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Return positive velocity, or 0 if negative/flat
  return Math.max(0, -slope); // Negative because we're going backwards in time
}

/**
 * Calculate forecast based on current data
 */
function calculateForecast(
  currentPR: number,
  velocity: number,
  experienceLevel: ExperienceLevel,
  historicalData: Array<{ oneRMEstimate: number | null; workoutDate: Date }>,
): ForecastCalculation {
  // Next standard plate increment
  const nextPRWeight = Math.ceil((currentPR + 2.5) / 2.5) * 2.5;

  // Sessions needed to reach next PR
  const sessionsToNextPR = Math.ceil((nextPRWeight - currentPR) / velocity);

  // Convert to weeks based on experience level
  const weeklyFrequency = getExpectedWeeklyFrequency(experienceLevel);
  const weeksToNextPR = Math.ceil(sessionsToNextPR / weeklyFrequency);

  // Calculate confidence
  const confidence = calculateForecastConfidence(historicalData, velocity);

  return {
    currentPR,
    nextPRWeight,
    sessionsToNextPR,
    weeksToNextPR,
    velocity,
    confidence,
  };
}

/**
 * Get user experience level from preferences
 */
async function getUserExperienceLevel(
  database: typeof db,
  userId: string,
): Promise<ExperienceLevel> {
  // This would typically come from user preferences
  // For now, default to intermediate
  return "intermediate";
}

/**
 * Get expected weekly training frequency based on experience level
 */
function getExpectedWeeklyFrequency(experienceLevel: ExperienceLevel): number {
  switch (experienceLevel) {
    case "beginner":
      return 2; // 2x per week
    case "intermediate":
      return 3; // 3x per week
    case "advanced":
      return 4; // 4x per week
    default:
      return 3;
  }
}

/**
 * Calculate forecast confidence based on data consistency
 */
function calculateForecastConfidence(
  historicalData: Array<{
    oneRMEstimate: number | null;
    workoutDate: Date;
  }>,
  velocity: number,
): number {
  const validData = historicalData.filter((d) => d.oneRMEstimate !== null);

  if (validData.length < 5) return 0.3; // Low confidence with little data

  // Calculate R-squared of the linear regression
  const recentData = validData.slice(0, 10);
  const n = recentData.length;

  // Calculate mean
  const meanY = recentData.reduce((sum, d) => sum + d.oneRMEstimate!, 0) / n;

  // Calculate total sum of squares
  const totalSS = recentData.reduce((sum, d) => {
    return sum + Math.pow(d.oneRMEstimate! - meanY, 2);
  }, 0);

  // Calculate residual sum of squares
  let residualSS = 0;
  recentData.forEach((data, index) => {
    const x = index;
    const predictedY = meanY - velocity * x; // Negative because going backwards
    residualSS += Math.pow(data.oneRMEstimate! - predictedY, 2);
  });

  const rSquared = 1 - residualSS / totalSS;

  // Adjust confidence based on velocity magnitude and consistency
  let confidence = Math.max(0, Math.min(1, rSquared));

  // Boost confidence for reasonable velocities (0.5-5 lbs per session)
  if (velocity >= 0.5 && velocity <= 5) {
    confidence = Math.min(1, confidence + 0.2);
  }

  // Reduce confidence for very high velocities (unrealistic)
  if (velocity > 10) {
    confidence = Math.max(0, confidence - 0.3);
  }

  return Math.round(confidence * 100) / 100; // Round to 2 decimal places
}

/**
 * Get PR forecast context for analysis
 */
export async function getPRForecastContext(
  database: typeof db,
  userId: string,
  masterExerciseId: number,
): Promise<PRForecastContext> {
  const historicalData = await getHistoricalPerformanceData(
    database,
    userId,
    masterExerciseId,
  );

  const validOneRMs = historicalData
    .map((d) => d.oneRMEstimate)
    .filter((rm): rm is number => rm !== null);

  const currentPR = validOneRMs.length > 0 ? Math.max(...validOneRMs) : 0;

  const velocity =
    validOneRMs.length >= 3 ? calculateProgressionVelocity(historicalData) : 0;

  return {
    userId,
    masterExerciseId,
    historicalData: historicalData.map((d) => ({
      weight: Number(d.weight) || 0,
      reps: Number(d.reps) || 0,
      date: d.workoutDate,
      oneRMEstimate: d.oneRMEstimate || 0,
      volume: (Number(d.weight) || 0) * (Number(d.reps) || 0),
    })),
    experienceLevel: await getUserExperienceLevel(database, userId),
  };
}
