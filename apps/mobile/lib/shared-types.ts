// Define AppRouter type locally to avoid import issues across packages
// This should match the structure from the web app's src/server/api/root.ts
export interface AppRouter {
  post: any;
  templates: {
    getAll: any;
    getById: any;
    create: any;
    update: any;
    delete: any;
  };
  workouts: {
    getRecent: any;
    getById: any;
    start: any;
    save: any;
    delete: any;
    getLastExerciseData: any;
    getLatestPerformanceForTemplateExercise: any;
    updateSessionSets: any;
  };
  preferences: any;
  jokes: any;
  whoop: any;
  webhooks: any;
  exercises: any;
  insights: any;
  progress: any;
  healthAdvice: any;
  wellness: any;
  suggestions: any;
}

// Template-specific types for mobile components
export interface Template {
  id: number;
  name: string;
  user_id: string;
  createdAt: Date;
  updatedAt: Date | null;
  exercises: TemplateExercise[];
}

export interface TemplateExercise {
  id: number;
  user_id: string;
  templateId: number;
  exerciseName: string;
  orderIndex: number;
  linkingRejected: boolean;
  createdAt: Date;
}

// Form types for creating/editing templates
export interface TemplateFormData {
  name: string;
  exercises: string[];
}

export interface CreateTemplateInput {
  name: string;
  exercises: string[];
}

export interface UpdateTemplateInput {
  id: number;
  name: string;
  exercises: string[];
}

// Workout Session types
export interface WorkoutSession {
  id: number;
  user_id: string;
  templateId: number;
  workoutDate: Date;
  theme_used?: string | null;
  device_type?: string | null;
  perf_metrics?: any;
  createdAt: Date;
  updatedAt?: Date | null;
  template?: Template;
  exercises: SessionExercise[];
}

export interface SessionExercise {
  id: number;
  user_id: string;
  sessionId: number;
  templateExerciseId?: number | null;
  exerciseName: string;
  setOrder: number;
  weight?: string | null;
  reps?: number | null;
  sets?: number | null;
  unit: string;
  rpe?: number | null;
  rest_seconds?: number | null;
  is_estimate: boolean;
  is_default_applied: boolean;
  createdAt: Date;
}

export interface SetInput {
  id: string;
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
  rpe?: number;
  rest?: number;
  isEstimate?: boolean;
  isDefaultApplied?: boolean;
}

export interface ExerciseInput {
  templateExerciseId?: number;
  exerciseName: string;
  sets: SetInput[];
  unit: "kg" | "lbs";
}

export interface StartWorkoutInput {
  templateId: number;
  workoutDate?: Date;
  theme_used?: string;
  device_type?: "android" | "ios" | "desktop" | "ipad" | "other";
  perf_metrics?: any;
}

export interface SaveWorkoutInput {
  sessionId: number;
  exercises: ExerciseInput[];
  theme_used?: string;
  device_type?: "android" | "ios" | "desktop" | "ipad" | "other";
  perf_metrics?: any;
}