import type {
  PlaybookMetadata,
  WeeklyAiPlan,
  WeeklyAlgorithmicPlan,
  SessionDeviation,
  PlaybookStatus,
  WeekType,
  WeekStatus,
} from "~/server/api/schemas/playbook";

// Full playbook with nested weeks and sessions
export interface PlaybookWithWeeks {
  id: number;
  userId: string;
  name: string;
  goalText: string | null;
  goalPreset: string | null;
  targetType: "template" | "exercise";
  targetIds: number[]; // Parsed from JSON
  duration: number;
  status: PlaybookStatus;
  hasAiPlan: boolean;
  metadata: PlaybookMetadata | null; // Parsed from JSON
  createdAt: Date;
  updatedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  weeks: PlaybookWeekWithSessions[];
}

export interface PlaybookWeekWithSessions {
  id: number;
  playbookId: number;
  weekNumber: number;
  weekType: WeekType;
  aiPlan: WeeklyAiPlan | null; // Parsed from JSON
  algorithmicPlan: WeeklyAlgorithmicPlan | null; // Parsed from JSON
  volumeTarget: number | null;
  status: WeekStatus;
  metadata: Record<string, unknown> | null; // Parsed from JSON
  createdAt: Date;
  updatedAt: Date | null;
  sessions: PlaybookSessionDetail[];
}

export interface PlaybookSessionDetail {
  id: number;
  playbookWeekId: number;
  sessionNumber: number;
  sessionDate: Date | null;
  prescribedWorkout: unknown; // Parsed from JSON (SessionPrescription)
  actualWorkoutId: number | null;
  adherenceScore: number | null;
  rpe: number | null;
  rpeNotes: string | null;
  deviation: SessionDeviation[] | null; // Parsed from JSON
  activePlanType: "ai" | "algorithmic";
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

// Playbook context for AI generation
export interface PlaybookGenerationContext {
  userId: string;
  targetType: "template" | "exercise";
  targetIds: number[];
  goalText?: string;
  goalPreset?: string;
  duration: number;

  // Historical session data
  recentSessions: SessionHistoryForPlaybook[];

  // Current 1RM estimates
  currentOneRmEstimates: Record<string, number>; // exerciseName -> 1RM in kg

  // User preferences
  preferences: {
    defaultWeightUnit: string;
    progressionType: string;
    trainingDaysPerWeek?: number;
  };

  // Volume trends
  volumeTrends: VolumeProgressionData[];

  // Warm-up patterns (optional, from user history)
  warmupPatterns?: Array<{
    exerciseName: string;
    pattern: Array<{
      weight: number;
      reps: number;
      percentageOfTop?: number;
    }>;
    confidence: "low" | "medium" | "high";
    sessionCount: number;
  }>;

  // Equipment constraints
  availableEquipment?: string[];
}

export interface SessionHistoryForPlaybook {
  sessionId: number;
  workoutDate: Date;
  templateId: number | null;
  templateName: string | null;
  exercises: ExerciseHistoryForPlaybook[];
  totalVolume: number;
}

export interface ExerciseHistoryForPlaybook {
  exerciseName: string;
  resolvedExerciseName: string;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  unit: string;
  volumeLoad: number | null;
  oneRmEstimate: number | null;
}

export interface VolumeProgressionData {
  exerciseName: string;
  weeklyData: {
    weekStart: Date;
    totalVolume: number;
    sessionCount: number;
    averageIntensity: number;
  }[];
  trendSlope: number; // Positive = increasing, negative = decreasing
}

// Adherence metrics for playbook
export interface AdherenceMetrics {
  playbookId: number;
  totalSessions: number;
  completedSessions: number;
  adherencePercentage: number; // 0-100
  averageAdherenceScore: number; // 0-100
  averageRpe: number | null; // 1-10
  deviationSummary: {
    sessionsTooEasy: number; // RPE < 4
    sessionsJustRight: number; // RPE 4-7
    sessionsTooHard: number; // RPE > 7
    sessionsWithFailedSets: number;
  };
  weeklyBreakdown: {
    weekNumber: number;
    sessionsCompleted: number;
    sessionsTotal: number;
    averageAdherence: number;
  }[];
}

// Volume progression comparison (planned vs actual)
export interface VolumeProgression {
  playbookId: number;
  weeklyComparison: {
    weekNumber: number;
    weekType: WeekType;
    plannedVolume: number;
    actualVolume: number | null;
    volumeDeviation: number | null; // Percentage deviation
    sessionBreakdown: {
      sessionNumber: number;
      plannedVolume: number;
      actualVolume: number | null;
    }[];
  }[];
  overallTrend: "increasing" | "decreasing" | "stable";
  totalPlannedVolume: number;
  totalActualVolume: number;
}

// PR attempt tracking
export interface PrAttemptTracking {
  playbookId: number;
  prAttempts: {
    weekNumber: number;
    sessionNumber: number;
    exerciseName: string;
    targetWeight: number;
    targetReps: number;
    confidence: number; // 0-1
    attempted: boolean;
    successful: boolean | null;
    actualWeight: number | null;
    actualReps: number | null;
    notes: string | null;
  }[];
  successRate: number; // Percentage of successful attempts
}

// Comparison between AI and algorithmic plans
export interface PlanComparison {
  playbookId: number;
  weekNumber: number;
  aiPlan: WeeklyAiPlan;
  algorithmicPlan: WeeklyAlgorithmicPlan;
  differences: {
    exerciseName: string;
    sessionNumber: number;
    aiPrescription: {
      sets: number;
      reps: number;
      weight: number | null;
    };
    algorithmicPrescription: {
      sets: number;
      reps: number;
      weight: number | null;
    };
    volumeDifference: number; // Percentage difference
  }[];
}

// Regeneration history
export interface RegenerationHistory {
  playbookId: number;
  regenerations: {
    id: number;
    triggeredBySessionId: number | null;
    reason: string;
    affectedWeekStart: number;
    affectedWeekEnd: number;
    previousPlanSnapshot: unknown; // Parsed from JSON
    newPlanSnapshot: unknown; // Parsed from JSON
    createdAt: Date;
  }[];
}
