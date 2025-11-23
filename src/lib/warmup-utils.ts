/**
 * Calculate warmup sets based on a top/working set weight
 *
 * Logic:
 * - ≤50kg: 5kg increments
 * - 51-100kg: 10kg increments
 * - >100kg: 20kg increments
 *
 * Warmups are capped at 5 sets maximum
 */

interface WarmupSet {
  weight: number;
  reps: number;
  isWarmup: true;
}

/**
 * Calculate warmup progression leading up to a top set
 * @param topWeight - The working/top set weight in kg
 * @param reps - Number of reps (same for all warmup sets)
 * @param maxWarmupSets - Maximum number of warmup sets (default 5)
 * @returns Array of warmup sets in ascending weight order
 */
export function calculateWarmupSets(
  topWeight: number,
  reps: number,
  maxWarmupSets = 5
): WarmupSet[] {
  // No warmups for very light weights
  if (topWeight <= 10) {
    return [];
  }

  // Determine increment based on weight range
  let increment: number;
  if (topWeight <= 50) {
    increment = 5;
  } else if (topWeight <= 100) {
    increment = 10;
  } else {
    increment = 20;
  }

  // Build warmup sets working backwards from top weight
  const warmups: WarmupSet[] = [];
  let weight = topWeight - increment;

  while (weight >= increment && warmups.length < maxWarmupSets) {
    warmups.unshift({
      weight,
      reps,
      isWarmup: true,
    });
    weight -= increment;
  }

  // If we hit the cap, keep the highest warmup sets (closest to working weight)
  if (warmups.length > maxWarmupSets) {
    return warmups.slice(-maxWarmupSets);
  }

  return warmups;
}

/**
 * Calculate the weight increment based on the top set weight
 * Useful for displaying to users
 */
export function getWeightIncrement(topWeight: number): number {
  if (topWeight <= 50) {
    return 5;
  } else if (topWeight <= 100) {
    return 10;
  } else {
    return 20;
  }
}
