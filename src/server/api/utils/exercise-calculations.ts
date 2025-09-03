/**
 * Exercise progression calculation utilities for Phase 3
 * Includes 1RM estimation, volume load, and progression analysis
 */

import { type SessionExerciseData } from "../types/exercise-progression";

/**
 * Calculate 1RM using Brzycki formula: weight × (36 / (37 - reps))
 * Falls back to Epley if reps > 36 or Brzycki gives invalid result
 * @param weight - Weight lifted in kg
 * @param reps - Number of repetitions
 * @returns Estimated 1RM in kg
 */
export function calculateOneRM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (weight <= 0 || reps <= 0) return 0;

  // Use Brzycki formula: weight × (36 / (37 - reps))
  if (reps <= 36) {
    const brzycki = weight * (36 / (37 - reps));
    if (brzycki > 0 && isFinite(brzycki)) {
      return Math.round(brzycki * 100) / 100; // Round to 2 decimal places
    }
  }

  // Fallback to Epley formula: weight × (1 + reps/30)
  const epley = weight * (1 + reps / 30);
  return Math.round(epley * 100) / 100;
}

/**
 * Calculate volume load: sets × reps × weight
 * @param sets - Number of sets
 * @param reps - Number of repetitions
 * @param weight - Weight lifted in kg
 * @returns Volume load in kg
 */
export function calculateVolumeLoad(sets: number, reps: number, weight: number): number {
  const volume = (sets || 0) * (reps || 0) * (weight || 0);
  return Math.round(volume * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate linear regression slope for progression trend analysis
 * @param dataPoints - Array of [x, y] pairs where x is time (days since start) and y is the metric
 * @returns Regression slope (positive = improving, negative = declining)
 */
export function calculateProgressionTrend(dataPoints: Array<[number, number]>): number {
  if (dataPoints.length < 2) return 0;

  const n = dataPoints.length;
  const sumX = dataPoints.reduce((sum, [x]) => sum + x, 0);
  const sumY = dataPoints.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = dataPoints.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumXX = dataPoints.reduce((sum, [x]) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return isFinite(slope) ? Math.round(slope * 1000) / 1000 : 0; // Round to 3 decimal places
}

/**
 * Calculate performance consistency score based on 1RM variance
 * @param oneRMValues - Array of 1RM estimates over time
 * @returns Consistency score from 0-100 (higher = more consistent)
 */
export function calculateConsistencyScore(oneRMValues: number[]): number {
  if (oneRMValues.length < 2) return 100;

  const mean = oneRMValues.reduce((sum, val) => sum + val, 0) / oneRMValues.length;
  const variance = oneRMValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / oneRMValues.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Convert to consistency score: lower variance = higher score
  const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
  const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));
  
  return Math.round(consistencyScore);
}

/**
 * Determine if an exercise performance represents a PR (Personal Record)
 * @param currentPerformance - Current exercise performance
 * @param historicalBest - Historical best performance
 * @param prType - Type of PR to check ("weight", "volume", "1rm")
 * @returns True if current performance is a PR
 */
export function isPR(
  currentPerformance: SessionExerciseData,
  historicalBest: SessionExerciseData,
  prType: "weight" | "volume" | "1rm"
): boolean {
  const currentWeight = parseFloat(String(currentPerformance.weight || "0"));
  const currentReps = currentPerformance.reps || 0;
  const currentSets = currentPerformance.sets || 1;
  
  const bestWeight = parseFloat(String(historicalBest.weight || "0"));
  const bestReps = historicalBest.reps || 0;
  const bestSets = historicalBest.sets || 1;

  switch (prType) {
    case "weight":
      return currentWeight > bestWeight;
    case "volume":
      const currentVolume = calculateVolumeLoad(currentSets, currentReps, currentWeight);
      const bestVolume = calculateVolumeLoad(bestSets, bestReps, bestWeight);
      return currentVolume > bestVolume;
    case "1rm":
      const currentOneRM = calculateOneRM(currentWeight, currentReps);
      const bestOneRM = calculateOneRM(bestWeight, bestReps);
      return currentOneRM > bestOneRM;
    default:
      return false;
  }
}

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (positive = increase, negative = decrease)
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 100) / 100; // Round to 2 decimal places
}

/**
 * Get date range for time period queries
 * @param timeRange - Time period ("week", "month", "quarter", "year")
 * @param startDate - Optional custom start date
 * @param endDate - Optional custom end date
 * @returns Object with start and end dates
 */
export function getDateRange(
  timeRange: "week" | "month" | "quarter" | "year",
  startDate?: Date,
  endDate?: Date
): { startDate: Date; endDate: Date } {
  if (startDate && endDate) {
    return { startDate, endDate };
  }

  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (timeRange) {
    case "week":
      start.setDate(end.getDate() - 7);
      break;
    case "month":
      start.setMonth(end.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(end.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return { startDate: start, endDate: end };
}

/**
 * Calculate workout frequency per week
 * @param workoutDates - Array of workout dates
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns Frequency as workouts per week
 */
export function calculateFrequency(workoutDates: Date[], startDate: Date, endDate: Date): number {
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.max(1, totalDays / 7);
  return Math.round((workoutDates.length / weeks) * 10) / 10; // Round to 1 decimal place
}