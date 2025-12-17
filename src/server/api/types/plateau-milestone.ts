import type {
  ExperienceLevel,
  PlateauStatus,
  MilestoneType,
  BodyweightSource,
} from "~/server/api/schemas/plateau-milestone";

// Base table types (inferred from Drizzle schema)
export interface KeyLift {
  id: number;
  userId: string;
  masterExerciseId: number;
  isTracking: boolean;
  maintenanceMode: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface Plateau {
  id: number;
  userId: string;
  masterExerciseId: number;
  keyLiftId: number | null;
  detectedAt: Date;
  resolvedAt: Date | null;
  stalledWeight: number;
  stalledReps: number;
  sessionCount: number;
  status: PlateauStatus;
  metadata: string | null;
  createdAt: Date;
}

export interface Milestone {
  id: number;
  userId: string;
  masterExerciseId: number | null;
  type: MilestoneType;
  targetValue: number;
  targetMultiplier: number | null;
  isSystemDefault: boolean;
  isCustomized: boolean;
  experienceLevel: ExperienceLevel;
  createdAt: Date;
}

export interface MilestoneAchievement {
  id: number;
  userId: string;
  milestoneId: number;
  achievedAt: Date;
  achievedValue: number;
  workoutId: number | null;
  metadata: string | null;
}

export interface PRForecast {
  id: number;
  userId: string;
  masterExerciseId: number;
  forecastedWeight: number;
  estimatedWeeksLow: number;
  estimatedWeeksHigh: number;
  confidencePercent: number;
  whoopRecoveryFactor: number | null;
  calculatedAt: Date;
  metadata: string | null;
}

export interface UserPreference {
  id: number;
  user_id: string;
  experienceLevel: ExperienceLevel;
  bodyweight: number | null;
  bodyweightSource: BodyweightSource | null;
}

// Enhanced types with computed fields
export interface KeyLiftWithDetails extends KeyLift {
  masterExercise?: {
    id: number;
    name: string;
  };
  currentPlateau?: Plateau;
  latestForecast?: PRForecast;
  nextMilestone?: Milestone;
  isTracked: boolean;
}

export interface PlateauAlert {
  id: number;
  exerciseName: string;
  masterExerciseId: number;
  stalledWeight: number;
  stalledReps: number;
  sessionCount: number;
  durationWeeks: number;
  severity: "low" | "medium" | "high";
  status: PlateauStatus;
  detectedAt: Date;
  recommendations: PlateauRecommendation[];
}

export interface PlateauRecommendation {
  rule: string;
  description: string;
  action: string;
  playbookCTA: boolean;
  priority: "low" | "medium" | "high";
}

export interface MilestoneProgress {
  milestone: Milestone;
  exerciseName?: string;
  currentValue: number;
  progressPercent: number;
  isAchieved: boolean;
  achievedAt?: Date;
  estimatedDate?: Date;
  nextMilestone?: Milestone;
}

export interface ForecastData {
  exerciseName: string;
  masterExerciseId: number;
  currentWeight: number;
  forecastedWeight: number;
  estimatedWeeksLow: number;
  estimatedWeeksHigh: number;
  confidencePercent: number;
  recoveryWarning?: string;
  calculatedAt: Date;
  trajectory: "improving" | "stable" | "declining";
}

export interface DashboardCardData {
  activePlateaus: PlateauAlert[];
  upcomingMilestones: MilestoneProgress[];
  prForecasts: ForecastData[];
  summary: {
    totalKeyLifts: number;
    activePlateauCount: number;
    upcomingMilestoneCount: number;
    averageConfidence: number;
  };
  lastUpdated: Date;
}

// User preferences with plateau/milestone settings
export type UserPreferencesWithPlateau = UserPreference;

// Plateau detection context
export interface PlateauDetectionContext {
  userId: string;
  masterExerciseId: number;
  sessions: Array<{
    weight: number;
    reps: number;
    date: Date;
    oneRMEstimate?: number;
  }>;
  maintenanceMode: boolean;
  experienceLevel: ExperienceLevel;
}

// PR forecasting context
export interface PRForecastContext {
  userId: string;
  masterExerciseId: number;
  historicalData: Array<{
    weight: number;
    reps: number;
    date: Date;
    oneRMEstimate: number;
    volume: number;
  }>;
  whoopRecovery?: number;
  experienceLevel: ExperienceLevel;
  bodyweight?: number;
}

// Milestone generation context
export interface MilestoneGenerationContext {
  userId: string;
  masterExerciseId?: number;
  experienceLevel: ExperienceLevel;
  bodyweight?: number;
  currentStats?: {
    currentOneRM: number;
    bestWeight: number;
    totalVolume: number;
  };
}

// API Response types
export interface KeyLiftListResponse {
  keyLifts: KeyLiftWithDetails[];
  totalCount: number;
  trackingCount: number;
  maintenanceCount: number;
}

export interface PlateauListResponse {
  plateaus: PlateauAlert[];
  totalCount: number;
  activeCount: number;
  resolvedCount: number;
}

export interface MilestoneListResponse {
  milestones: MilestoneProgress[];
  totalCount: number;
  achievedCount: number;
  upcomingCount: number;
}

export interface ForecastListResponse {
  forecasts: ForecastData[];
  totalCount: number;
  averageConfidence: number;
}

// Mutation responses
export interface KeyLiftToggleResponse {
  success: boolean;
  keyLift: KeyLiftWithDetails;
  message: string;
}

export interface PlateauDetectionResponse {
  plateauDetected: boolean;
  plateau?: PlateauAlert;
  recommendations: PlateauRecommendation[];
}

export interface MilestoneAchievementResponse {
  success: boolean;
  achievement: MilestoneAchievement;
  progress: MilestoneProgress;
  isNewAchievement: boolean;
}

// Analytics and tracking
export interface PlateauMilestoneAnalytics {
  totalPlateaus: number;
  resolvedPlateaus: number;
  averageResolutionTime: number; // days
  totalMilestones: number;
  achievedMilestones: number;
  averageMilestoneTime: number; // days
  forecastAccuracy: number; // percentage
  mostTrackedExercise: string;
  improvementRate: number; // percentage per month
}

// Integration with other features
export interface PlaybookIntegration {
  plateauBreakerSuggestions: Array<{
    exerciseName: string;
    recommendation: string;
    playbookTemplate: string;
  }>;
}

export interface WHOOPIntegration {
  recoveryAdjustedForecasts: Array<{
    masterExerciseId: number;
    baseForecast: number;
    adjustedForecast: number;
    recoveryScore: number;
    adjustmentFactor: number;
  }>;
}
