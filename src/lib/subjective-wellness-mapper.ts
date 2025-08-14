/**
 * Maps subjective wellness inputs to WHOOP metric format for AI processing
 * Updated for simplified 2-input system
 */

// Legacy interface for backward compatibility
export interface SubjectiveWellnessData {
  energyLevel: number; // 1-10
  sleepQuality: number; // 1-10
  recoveryFeeling: number; // 1-10
  stressLevel: number; // 1-10 (inverted for calculations)
}

// New simplified wellness interface (2 inputs only)
export interface ManualWellnessData {
  // Only 2 manual inputs for simplicity
  energyLevel: number; // 1-10 (How energetic do you feel?)
  sleepQuality: number; // 1-10 (How well did you sleep?)
  
  // Metadata
  deviceTimezone: string; // Device timezone
  notes?: string; // Optional context (max 500 chars)
}

// Complete wellness data entry for database storage
export interface WellnessDataEntry {
  id?: number;
  userId: string;
  sessionId?: number;
  date: Date;
  wellnessData: ManualWellnessData;
  hasWhoopData: boolean;
  whoopData?: WhoopMetrics;
  deviceTimezone: string;
  submittedAt: Date;
  notes?: string;
}

export interface WhoopMetrics {
  recovery_score?: number | undefined;
  sleep_performance?: number | undefined;
  hrv_now_ms?: number | undefined;
  hrv_baseline_ms?: number | undefined;
  rhr_now_bpm?: number | undefined;
  rhr_baseline_bpm?: number | undefined;
  yesterday_strain?: number | undefined;
}

/**
 * Maps simplified 2-input wellness data to WHOOP-compatible metrics
 * 
 * Simplified mapping logic (2 inputs only):
 * - Energy Level (1-10) -> Primary driver for Recovery Score (0-100)
 * - Sleep Quality (1-10) -> Sleep Performance (0-100) + Recovery Score influence
 * - HRV/RHR are set to undefined since we can't simulate physiological data
 * - Yesterday Strain estimated based on energy level
 */
export function mapManualWellnessToWhoopMetrics(
  manualData: ManualWellnessData
): WhoopMetrics {
  const { energyLevel, sleepQuality } = manualData;

  // Convert 1-10 scales to 0-100 percentages
  const energyScore = ((energyLevel - 1) / 9) * 100; // 1->0%, 10->100%
  const sleepScore = ((sleepQuality - 1) / 9) * 100;

  // Simplified recovery score calculation (2 inputs only)
  // Weight: 70% energy (primary indicator), 30% sleep quality
  const compositeRecoveryScore = Math.round(
    (energyScore * 0.7) + (sleepScore * 0.3)
  );

  // Estimate yesterday's strain based on energy level
  // Lower energy suggests higher previous strain
  const estimatedYesterdayStrain = Math.round(
    20 - ((energyLevel - 1) / 9) * 15 // Range: 5-20, inverted
  );

  return {
    recovery_score: Math.max(0, Math.min(100, compositeRecoveryScore)),
    sleep_performance: Math.max(0, Math.min(100, sleepScore)),
    // HRV and RHR cannot be simulated from subjective data
    hrv_now_ms: undefined,
    hrv_baseline_ms: undefined,
    rhr_now_bpm: undefined,
    rhr_baseline_bpm: undefined,
    // Estimate previous day strain
    yesterday_strain: Math.max(5, Math.min(20, estimatedYesterdayStrain)),
  };
}

/**
 * Maps subjective wellness data to WHOOP-compatible metrics (legacy 4-input)
 * 
 * Legacy mapping logic:
 * - Energy Level (1-10) -> Recovery Score (0-100)
 * - Sleep Quality (1-10) -> Sleep Performance (0-100)
 * - Recovery Feeling (1-10) -> Additional input for Recovery Score
 * - Stress Level (1-10, inverted) -> Influences Recovery Score
 * - HRV/RHR are set to null since we can't simulate physiological data
 * - Yesterday Strain estimated based on recovery feeling
 */
export function mapSubjectiveToWhoopMetrics(
  subjectiveData: SubjectiveWellnessData
): WhoopMetrics {
  const {
    energyLevel,
    sleepQuality,
    recoveryFeeling,
    stressLevel,
  } = subjectiveData;

  // Convert 1-10 scales to 0-100 percentages
  const energyScore = ((energyLevel - 1) / 9) * 100; // 1->0%, 10->100%
  const sleepScore = ((sleepQuality - 1) / 9) * 100;
  const recoveryScore = ((recoveryFeeling - 1) / 9) * 100;
  
  // Invert stress level (1 = very low stress = good, 10 = very high stress = bad)
  const stressImpact = ((10 - stressLevel) / 9) * 100; // Lower stress = higher score

  // Calculate composite recovery score
  // Weight: 40% energy, 30% recovery feeling, 20% stress impact, 10% sleep
  const compositeRecoveryScore = Math.round(
    (energyScore * 0.4) +
    (recoveryScore * 0.3) +
    (stressImpact * 0.2) +
    (sleepScore * 0.1)
  );

  // Estimate yesterday's strain based on recovery feeling
  // Lower recovery feeling suggests higher previous strain
  const estimatedYesterdayStrain = Math.round(
    20 - ((recoveryFeeling - 1) / 9) * 15 // Range: 5-20, inverted
  );

  return {
    recovery_score: Math.max(0, Math.min(100, compositeRecoveryScore)),
    sleep_performance: Math.max(0, Math.min(100, sleepScore)),
    // HRV and RHR cannot be accurately simulated from subjective data
    hrv_now_ms: undefined,
    hrv_baseline_ms: undefined,
    rhr_now_bpm: undefined,
    rhr_baseline_bpm: undefined,
    // Estimate previous day strain
    yesterday_strain: Math.max(5, Math.min(20, estimatedYesterdayStrain)),
  };
}

/**
 * Creates a complete WHOOP data object with neutral defaults for missing values
 */
export function createWhoopDataWithDefaults(
  subjectiveData: SubjectiveWellnessData
): WhoopMetrics {
  const mappedData = mapSubjectiveToWhoopMetrics(subjectiveData);
  
  return {
    recovery_score: mappedData.recovery_score,
    sleep_performance: mappedData.sleep_performance,
    hrv_now_ms: undefined, // Cannot simulate physiological data
    hrv_baseline_ms: undefined,
    rhr_now_bpm: undefined,
    rhr_baseline_bpm: undefined,
    yesterday_strain: mappedData.yesterday_strain,
  };
}

/**
 * Validates simplified manual wellness input data (2 inputs only)
 */
export function validateManualWellnessData(
  data: Partial<ManualWellnessData>
): data is ManualWellnessData {
  const { energyLevel, sleepQuality, deviceTimezone, notes } = data;
  
  // Validate required fields
  if (
    typeof energyLevel !== 'number' ||
    typeof sleepQuality !== 'number' ||
    typeof deviceTimezone !== 'string' ||
    energyLevel < 1 || energyLevel > 10 ||
    sleepQuality < 1 || sleepQuality > 10
  ) {
    return false;
  }

  // Validate optional notes field
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
    return false;
  }

  return true;
}

/**
 * Validates subjective wellness input data (legacy 4-input)
 */
export function validateSubjectiveWellnessData(
  data: Partial<SubjectiveWellnessData>
): data is SubjectiveWellnessData {
  const { energyLevel, sleepQuality, recoveryFeeling, stressLevel } = data;
  
  return (
    typeof energyLevel === 'number' &&
    typeof sleepQuality === 'number' &&
    typeof recoveryFeeling === 'number' &&
    typeof stressLevel === 'number' &&
    energyLevel >= 1 && energyLevel <= 10 &&
    sleepQuality >= 1 && sleepQuality <= 10 &&
    recoveryFeeling >= 1 && recoveryFeeling <= 10 &&
    stressLevel >= 1 && stressLevel <= 10
  );
}

/**
 * Gets user-friendly labels for simplified wellness ratings (2 inputs)
 */
export function getManualWellnessLabels() {
  return {
    energyLevel: {
      1: 'Completely Drained',
      2: 'Very Low Energy',
      3: 'Low Energy',
      4: 'Below Average',
      5: 'Average',
      6: 'Above Average',
      7: 'Good Energy',
      8: 'High Energy',
      9: 'Very High Energy',
      10: 'Peak Energy'
    },
    sleepQuality: {
      1: 'Terrible Sleep',
      2: 'Very Poor Sleep',
      3: 'Poor Sleep',
      4: 'Below Average Sleep',
      5: 'Average Sleep',
      6: 'Above Average Sleep',
      7: 'Good Sleep',
      8: 'Great Sleep',
      9: 'Excellent Sleep',
      10: 'Perfect Sleep'
    }
  };
}

/**
 * Gets quick preset combinations for mobile UX
 */
export function getWellnessPresets() {
  return {
    greatDay: {
      energyLevel: 8,
      sleepQuality: 8,
      label: '🌟 Great Day',
      description: 'High energy, great sleep'
    },
    averageDay: {
      energyLevel: 6,
      sleepQuality: 6,
      label: '😐 Average Day',
      description: 'Normal energy, decent sleep'
    },
    toughDay: {
      energyLevel: 3,
      sleepQuality: 4,
      label: '😴 Tough Day',
      description: 'Low energy, poor sleep'
    }
  };
}

/**
 * Gets user-friendly labels for subjective ratings (legacy 4-input)
 */
export function getSubjectiveWellnessLabels() {
  return {
    energyLevel: {
      1: 'Completely Drained',
      2: 'Very Low Energy',
      3: 'Low Energy',
      4: 'Below Average',
      5: 'Average',
      6: 'Above Average',
      7: 'Good Energy',
      8: 'High Energy',
      9: 'Very High Energy',
      10: 'Peak Energy'
    },
    sleepQuality: {
      1: 'Terrible Sleep',
      2: 'Very Poor Sleep',
      3: 'Poor Sleep',
      4: 'Below Average Sleep',
      5: 'Average Sleep',
      6: 'Above Average Sleep',
      7: 'Good Sleep',
      8: 'Great Sleep',
      9: 'Excellent Sleep',
      10: 'Perfect Sleep'
    },
    recoveryFeeling: {
      1: 'Not Recovered',
      2: 'Very Poor Recovery',
      3: 'Poor Recovery',
      4: 'Below Average Recovery',
      5: 'Average Recovery',
      6: 'Above Average Recovery',
      7: 'Good Recovery',
      8: 'Great Recovery',
      9: 'Excellent Recovery',
      10: 'Fully Recovered'
    },
    stressLevel: {
      1: 'No Stress',
      2: 'Very Low Stress',
      3: 'Low Stress',
      4: 'Below Average Stress',
      5: 'Average Stress',
      6: 'Above Average Stress',
      7: 'High Stress',
      8: 'Very High Stress',
      9: 'Extreme Stress',
      10: 'Overwhelming Stress'
    }
  };
}