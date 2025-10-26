import { type SessionDebriefContent } from "~/server/api/schemas/health-advice-debrief";

export interface SessionDebriefExerciseSet {
  setOrder: number;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  unit: "kg" | "lbs";
  volume: number;
  intensity?: number | null;
}

export interface SessionDebriefExerciseSnapshot {
  exerciseName: string;
  templateExerciseId: number | null;
  totalVolume: number;
  estimatedOneRm: number | null;
  bestWeight: number | null;
  bestReps: number | null;
  sets: SessionDebriefExerciseSet[];
  historicalSets?: SessionDebriefExerciseSet[];
  prFlags: Array<"weight" | "volume" | "oneRM">;
  previousBest?: {
    volume?: number | null;
    bestWeight?: number | null;
    estimatedOneRm?: number | null;
  };
}

export interface SessionDebriefAdherenceSnapshot {
  sessionsLast7Days: number;
  sessionsLast28Days: number;
  weeklyFrequency: number;
  rollingCompliance: number;
}

export interface SessionDebriefStreakSnapshot {
  current: number;
  longest: number;
  lastWorkoutDate?: string;
}

export interface SessionDebriefHealthAdviceSummary {
  readinessScore?: number;
  overloadMultiplier?: number;
  summary?: string;
  focusFlags?: string[];
}

export interface SessionDebriefContext {
  sessionId: number;
  sessionDate: string;
  templateName: string;
  totalExercises: number;
  totalVolume: number;
  estimatedDurationMinutes?: number | null;
  exercises: SessionDebriefExerciseSnapshot[];
  adherence: SessionDebriefAdherenceSnapshot;
  streak: SessionDebriefStreakSnapshot;
  prHighlights: SessionDebriefExerciseSnapshot[];
  healthAdvice?: SessionDebriefHealthAdviceSummary;
  previousDebrief?: SessionDebriefContent | null;
}

export interface SessionDebriefGenerationPayload {
  context: SessionDebriefContext;
  locale: string;
  timezone?: string;
}
