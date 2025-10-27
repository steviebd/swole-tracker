/**
 * TypeScript types for exercise progression data structures
 * Used across the progress router and related utilities
 */

// Raw session exercise data from database queries
export interface SessionExerciseData {
  workoutDate: Date;
  exerciseName: string;
  weight: string | null;
  reps: number | null;
  sets: number | null;
  unit: string;
  one_rm_estimate?: string | null;
  volume_load?: string | null;
}

// Personal record data structure
export interface PersonalRecord {
  date: string; // ISO date string
  weight: number;
  reps: number;
  type: "1RM" | "Volume" | "Weight";
  oneRMPercentage?: number; // For volume PRs, what % of 1RM was used
}

// Top set performance data
export interface TopSet {
  date: string; // ISO date string
  weight: number;
  reps: number;
  oneRMPercentage: number; // What % of estimated 1RM this represents
}

// Exercise strength progression response structure
export interface ExerciseStrengthProgression {
  currentOneRM: number; // kg
  oneRMChange: number; // kg change from previous period
  volumeTrend: number; // percentage change in volume
  sessionCount: number;
  frequency: number; // per week
  recentPRs: PersonalRecord[];
  topSets: TopSet[];
  progressionTrend: number; // linear regression slope
  consistencyScore: number; // 0-100 performance consistency
  timeline: Array<{
    date: string;
    oneRM: number;
  }>;
}

// Exercise volume progression response structure  
export interface ExerciseVolumeProgression {
  currentVolume: number; // kg total volume in current period
  volumeChange: number; // kg change from previous period
  volumeChangePercent: number; // percentage change
  averageVolumePerSession: number;
  sessionCount: number;
  frequency: number; // per week
  volumeByWeek: Array<{
    weekStart: string; // ISO date string
    totalVolume: number;
    sessionCount: number;
  }>;
}

// Exercise recent PRs response structure
export interface ExerciseRecentPRs {
  exerciseName: string;
  recentPRs: PersonalRecord[];
  currentBest: {
    oneRM: number;
    maxWeight: number;
    maxVolume: number;
  };
  prFrequency: number; // PRs per month
}

// Exercise top sets response structure
export interface ExerciseTopSets {
  exerciseName: string;
  topSets: TopSet[];
  averageIntensity: number; // average % of 1RM across top sets
  heaviestSet: TopSet;
  mostRecentHeavy: TopSet; // most recent set above 85% 1RM
}

// Top exercises by frequency response structure
export interface TopExercise {
  exerciseName: string;
  sessionCount: number;
  frequency: number; // per week
  totalVolume: number;
  averageOneRM: number;
  lastTrained: string; // ISO date string
  trend: "improving" | "stable" | "declining"; // based on recent progression
  templateExerciseIds: number[];
  masterExerciseId: number | null;
  aliasCount: number;
  aliases: string[];
}

// Database query result types with computed columns
export interface SessionExerciseWithComputed extends SessionExerciseData {
  one_rm_estimate: string | null;
  volume_load: string | null;
}

// Helper type for aggregated exercise statistics
export interface ExerciseStats {
  exerciseName: string;
  sessionCount: number;
  totalVolume: number;
  maxOneRM: number;
  avgOneRM: number;
  lastWorkoutDate: Date;
  firstWorkoutDate: Date;
  prCount: number;
}
