// Recovery data interfaces
export interface RecoveryData {
  recoveryScore?: number | null; // 0-100 from WHOOP or manual
  sleepPerformance?: number | null; // 0-100 from WHOOP or manual
  hrvStatus?: "low" | "baseline" | "high" | null; // Based on deviation from baseline
  rhrStatus?: "elevated" | "baseline" | "optimal" | null; // Based on deviation from baseline
  readinessScore?: number | null; // 0.00-1.00 calculated composite readiness
}

// Recommendation types
export type RecommendationType =
  | "train_as_planned"
  | "reduce_intensity"
  | "reduce_volume"
  | "active_recovery"
  | "rest_day";

export type UserAction = "accepted" | "modified" | "ignored" | "deferred";

export type RecoveryPlannerStrategy =
  | "conservative"
  | "moderate"
  | "adaptive"
  | "aggressive";

// Preferences interface
export interface RecoveryPlannerPreferences {
  enableRecoveryPlanner: boolean;
  recoveryPlannerStrategy: RecoveryPlannerStrategy;
  recoveryPlannerSensitivity: number; // 1-10 scale
  autoAdjustIntensity: boolean;
  recoveryPlannerPreferences?: Record<string, any>; // Custom preferences JSON
}

// Request/Response interfaces
export interface RecoveryPlannerRequest {
  templateId?: number;
  workoutDate: Date;
  plannedWorkout: Record<string, any>; // JSON representation of planned workout
  recoveryData: RecoveryData;
  userPreferences: RecoveryPlannerPreferences;
}

export interface RecoveryPlannerResponse {
  recommendation: RecommendationType;
  intensityAdjustment: number; // 0.50-1.20 multiplier
  volumeAdjustment: number; // 0.50-1.20 multiplier
  suggestedModifications?: Record<string, any>; // JSON object
  reasoning: string;
  confidence: number; // 0.00-1.00 confidence in recommendation
}

// Database interfaces
export interface RecoveryPlannerLog {
  id?: number;
  user_id: string;
  sessionId: number;
  templateId?: number | null;
  recoveryScore?: number | null;
  sleepPerformance?: number | null;
  hrvStatus?: "low" | "baseline" | "high" | null;
  rhrStatus?: "elevated" | "baseline" | "optimal" | null;
  readinessScore?: number | null;
  recommendation: RecommendationType;
  intensityAdjustment?: number | null;
  volumeAdjustment?: number | null;
  suggestedModifications?: string | null; // JSON string
  reasoning?: string | null;
  userAction?: UserAction | null;
  appliedAdjustments?: string | null; // JSON string
  userFeedback?: string | null;
  plannedWorkoutJson?: string | null; // JSON string
  adjustedWorkoutJson?: string | null; // JSON string
  metadata?: string | null; // JSON string
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateRecoveryPlannerLog {
  id: number;
  userAction?: UserAction;
  appliedAdjustments?: string; // JSON string
  userFeedback?: string;
  adjustedWorkoutJson?: string; // JSON string
  metadata?: string; // JSON string
}

// Helper interfaces for UI components
export interface RecoveryPlannerCardData {
  recommendation: RecommendationType;
  reasoning: string;
  intensityAdjustment: number;
  volumeAdjustment: number;
  confidence: number;
  recoveryData: RecoveryData;
  canAdjust: boolean;
}

export interface RecoveryPlannerHistory {
  id: number;
  date: Date;
  templateName?: string;
  recommendation: RecommendationType;
  userAction?: UserAction;
  effectiveness?: number; // How well the recommendation worked out
}

// Algorithm configuration interfaces
export interface RecoveryThresholds {
  redZone: number; // Below this, recommend rest or active recovery
  yellowZone: number; // Below this, recommend reduced intensity/volume
  greenZone: number; // Above this, train as planned
}

export interface StrategyMultipliers {
  conservative: {
    redZoneIntensity: number;
    redZoneVolume: number;
    yellowZoneIntensity: number;
    yellowZoneVolume: number;
  };
  moderate: {
    redZoneIntensity: number;
    redZoneVolume: number;
    yellowZoneIntensity: number;
    yellowZoneVolume: number;
  };
  adaptive: {
    redZoneIntensity: number;
    redZoneVolume: number;
    yellowZoneIntensity: number;
    yellowZoneVolume: number;
  };
  aggressive: {
    redZoneIntensity: number;
    redZoneVolume: number;
    yellowZoneIntensity: number;
    yellowZoneVolume: number;
  };
}
