"use client";

type PosthogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};

let posthogClient: PosthogClient;

// Lazy load posthog to avoid initialization issues in tests
const getPosthogClient = (): PosthogClient => {
  if (!posthogClient) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const posthog = require("posthog-js");
      posthogClient = posthog.default || posthog;
    } catch {
      // Fallback for tests - no-op implementation
      /* eslint-disable @typescript-eslint/no-empty-function */
      posthogClient = {
        capture: () => {},
        identify: () => {},
        reset: () => {},
      };
      /* eslint-enable @typescript-eslint/no-empty-function */
    }
  }
  return posthogClient;
};

/**
 * Allow tests to replace the client while keeping production usage untouched.
 * Exported for testing only; guarded to avoid leaking into runtime code paths.
 */
export function setPosthogClientForTesting(client: PosthogClient) {
  posthogClient = client;
}

export function resetPosthogClientForTesting() {
  posthogClient = getPosthogClient();
}

const safeOnline = () =>
  typeof navigator === "undefined" ? false : navigator.onLine === true;
const safeCapture = (event: string, props?: Record<string, unknown>) => {
  try {
    if (!safeOnline()) return;
    getPosthogClient().capture?.(event, props ?? {});
  } catch {
    // swallow
  }
};

export const analytics = {
  // Page tracking
  pageView: (page: string, properties?: Record<string, unknown>) => {
    try {
      const url =
        typeof window !== "undefined" ? window.location.href : undefined;
      safeCapture("$pageview", {
        $current_url: url,
        page,
        ...properties,
      });
    } catch {
      // ignore
    }
  },

  event: (name: string, properties?: Record<string, unknown>) => {
    safeCapture(name, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  // Workout events
  workoutStarted: (templateId: string, templateName: string) => {
    safeCapture("workout_started", {
      templateId,
      templateName,
      timestamp: new Date().toISOString(),
    });
  },

  workoutCompleted: (
    sessionId: string,
    duration: number,
    exerciseCount: number,
  ) => {
    safeCapture("workout_completed", {
      sessionId,
      duration,
      exerciseCount,
      timestamp: new Date().toISOString(),
    });
  },

  exerciseLogged: (
    exerciseId: string,
    exerciseName: string,
    sets: number,
    weight?: number,
  ) => {
    safeCapture("exercise_logged", {
      exerciseId,
      exerciseName,
      sets,
      weight,
      timestamp: new Date().toISOString(),
    });
  },

  // Template events
  templateCreated: (templateId: string, exerciseCount: number) => {
    safeCapture("template_created", {
      templateId,
      exerciseCount,
      timestamp: new Date().toISOString(),
    });
  },

  templateDeleted: (templateId: string) => {
    safeCapture("template_deleted", {
      templateId,
      timestamp: new Date().toISOString(),
    });
  },

  templateEdited: (templateId: string, exerciseCount: number) => {
    safeCapture("template_edited", {
      templateId,
      exerciseCount,
      timestamp: new Date().toISOString(),
    });
  },

  templateDuplicated: (templateId: string) => {
    safeCapture("template_duplicated", {
      templateId,
      timestamp: new Date().toISOString(),
    });
  },

  // Settings events
  weightUnitChanged: (unit: "kg" | "lbs") => {
    safeCapture("weight_unit_changed", {
      unit,
      timestamp: new Date().toISOString(),
    });
  },

  // Error tracking
  error: (error: Error, context?: Record<string, unknown>) => {
    safeCapture("error", {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  },

  // Feature usage
  featureUsed: (feature: string, properties?: Record<string, unknown>) => {
    safeCapture("feature_used", {
      feature,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  aiDebriefViewed: (
    sessionId: string,
    version: number,
    streakLength?: number,
  ) => {
    safeCapture("ai_debrief.viewed", {
      sessionId,
      version,
      streakLength,
      timestamp: new Date().toISOString(),
    });
  },

  aiDebriefRegenerated: (
    sessionId: string,
    version: number,
    reason?: string,
  ) => {
    safeCapture("ai_debrief.regenerated", {
      sessionId,
      version,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  aiDebriefDismissed: (sessionId: string, version: number, pinned: boolean) => {
    safeCapture("ai_debrief.dismissed", {
      sessionId,
      version,
      pinned,
      timestamp: new Date().toISOString(),
    });
  },

  // Navigation events
  navigationChanged: (from: string, to: string, source?: string) => {
    safeCapture("navigation_changed", {
      from,
      to,
      source,
      timestamp: new Date().toISOString(),
    });
  },

  // Search and filter events
  searchPerformed: (query: string, resultsCount: number, category?: string) => {
    safeCapture("search_performed", {
      query,
      resultsCount,
      category,
      timestamp: new Date().toISOString(),
    });
  },

  filtersApplied: (filters: Record<string, unknown>, resultsCount: number) => {
    safeCapture("filters_applied", {
      filters,
      resultsCount,
      timestamp: new Date().toISOString(),
    });
  },

  // Social and sharing events
  workoutShared: (workoutId: string, platform: string) => {
    safeCapture("workout_shared", {
      workoutId,
      platform,
      timestamp: new Date().toISOString(),
    });
  },

  progressShared: (timeRange: string, platform: string) => {
    safeCapture("progress_shared", {
      timeRange,
      platform,
      timestamp: new Date().toISOString(),
    });
  },

  // Goal and achievement events
  goalSet: (goalType: string, target: number, unit: string) => {
    safeCapture("goal_set", {
      goalType,
      target,
      unit,
      timestamp: new Date().toISOString(),
    });
  },

  goalAchieved: (
    goalType: string,
    actual: number,
    target: number,
    unit: string,
  ) => {
    safeCapture("goal_achieved", {
      goalType,
      actual,
      target,
      unit,
      timestamp: new Date().toISOString(),
    });
  },

  personalRecord: (
    exerciseId: string,
    exerciseName: string,
    previousBest: number,
    newBest: number,
    unit: string,
  ) => {
    safeCapture("personal_record", {
      exerciseId,
      exerciseName,
      previousBest,
      newBest,
      unit,
      timestamp: new Date().toISOString(),
    });
  },

  // Device and connectivity events
  offlineModeEnabled: () => {
    safeCapture("offline_mode_enabled", {
      timestamp: new Date().toISOString(),
    });
  },

  syncCompleted: (itemsSynced: number, timeTaken: number) => {
    safeCapture("sync_completed", {
      itemsSynced,
      timeTaken,
      timestamp: new Date().toISOString(),
    });
  },

  // User engagement events
  appInstalled: (source?: string) => {
    safeCapture("app_installed", {
      source,
      timestamp: new Date().toISOString(),
    });
  },

  tutorialCompleted: (tutorialId: string, timeSpent: number) => {
    safeCapture("tutorial_completed", {
      tutorialId,
      timeSpent,
      timestamp: new Date().toISOString(),
    });
  },

  feedbackSubmitted: (rating: number, category: string, comments?: string) => {
    safeCapture("feedback_submitted", {
      rating,
      category,
      comments,
      timestamp: new Date().toISOString(),
    });
  },

  // Performance tracking
  progressPageLoad: (
    loadTime: number,
    queryCount: number,
    dataPoints: number,
    cacheHit: boolean,
  ) => {
    safeCapture("progress_page_load", {
      loadTime,
      queryCount,
      dataPoints,
      cacheHit,
      timestamp: new Date().toISOString(),
    });
  },

  progressSectionLoad: (
    section: string,
    loadTime: number,
    dataPoints: number,
    error?: string,
  ) => {
    safeCapture("progress_section_load", {
      section,
      loadTime,
      dataPoints,
      error,
      timestamp: new Date().toISOString(),
    });
  },

  databaseQueryPerformance: (
    queryName: string,
    duration: number,
    rowCount: number,
    userId: string,
  ) => {
    safeCapture("database_query_performance", {
      queryName,
      duration,
      rowCount,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
};
