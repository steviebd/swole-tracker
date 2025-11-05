"use client";

import posthog from "posthog-js";

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
      // Use the initialized PostHog instance from the provider
      posthogClient = posthog;
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

const getTimestamp = () => {
  return typeof window !== "undefined"
    ? new Date().toISOString()
    : new Date(0).toISOString();
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
      timestamp:
        typeof window !== "undefined"
          ? new Date().toISOString()
          : new Date(0).toISOString(),
    });
  },

  // Workout events
  workoutStarted: (templateId: string, templateName: string) => {
    safeCapture("workout_started", {
      templateId,
      templateName,
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
    });
  },

  // Template events
  templateCreated: (templateId: string, exerciseCount: number) => {
    safeCapture("template_created", {
      templateId,
      exerciseCount,
      timestamp: getTimestamp(),
    });
  },

  templateDeleted: (templateId: string) => {
    safeCapture("template_deleted", {
      templateId,
      timestamp: getTimestamp(),
    });
  },

  templateEdited: (templateId: string, exerciseCount: number) => {
    safeCapture("template_edited", {
      templateId,
      exerciseCount,
      timestamp: getTimestamp(),
    });
  },

  templateDuplicated: (templateId: string) => {
    safeCapture("template_duplicated", {
      templateId,
      timestamp: getTimestamp(),
    });
  },

  // Settings events
  weightUnitChanged: (unit: "kg" | "lbs") => {
    safeCapture("weight_unit_changed", {
      unit,
      timestamp: getTimestamp(),
    });
  },

  // Error tracking
  error: (error: Error, context?: Record<string, unknown>) => {
    safeCapture("error", {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: getTimestamp(),
    });
  },

  // Feature usage
  featureUsed: (feature: string, properties?: Record<string, unknown>) => {
    safeCapture("feature_used", {
      feature,
      ...properties,
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
    });
  },

  aiDebriefDismissed: (sessionId: string, version: number, pinned: boolean) => {
    safeCapture("ai_debrief.dismissed", {
      sessionId,
      version,
      pinned,
      timestamp: getTimestamp(),
    });
  },

  // Navigation events
  navigationChanged: (from: string, to: string, source?: string) => {
    safeCapture("navigation_changed", {
      from,
      to,
      source,
      timestamp: getTimestamp(),
    });
  },

  // Search and filter events
  searchPerformed: (query: string, resultsCount: number, category?: string) => {
    safeCapture("search_performed", {
      query,
      resultsCount,
      category,
      timestamp: getTimestamp(),
    });
  },

  filtersApplied: (filters: Record<string, unknown>, resultsCount: number) => {
    safeCapture("filters_applied", {
      filters,
      resultsCount,
      timestamp: getTimestamp(),
    });
  },

  // Social and sharing events
  workoutShared: (workoutId: string, platform: string) => {
    safeCapture("workout_shared", {
      workoutId,
      platform,
      timestamp: getTimestamp(),
    });
  },

  progressShared: (timeRange: string, platform: string) => {
    safeCapture("progress_shared", {
      timeRange,
      platform,
      timestamp: getTimestamp(),
    });
  },

  // Goal and achievement events
  goalSet: (goalType: string, target: number, unit: string) => {
    safeCapture("goal_set", {
      goalType,
      target,
      unit,
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
    });
  },

  // Device and connectivity events
  offlineModeEnabled: () => {
    safeCapture("offline_mode_enabled", {
      timestamp: getTimestamp(),
    });
  },

  syncCompleted: (itemsSynced: number, timeTaken: number) => {
    safeCapture("sync_completed", {
      itemsSynced,
      timeTaken,
      timestamp: getTimestamp(),
    });
  },

  // User engagement events
  appInstalled: (source?: string) => {
    safeCapture("app_installed", {
      source,
      timestamp: getTimestamp(),
    });
  },

  tutorialCompleted: (tutorialId: string, timeSpent: number) => {
    safeCapture("tutorial_completed", {
      tutorialId,
      timeSpent,
      timestamp: getTimestamp(),
    });
  },

  feedbackSubmitted: (rating: number, category: string, comments?: string) => {
    safeCapture("feedback_submitted", {
      rating,
      category,
      comments,
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
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
      timestamp: getTimestamp(),
    });
  },

  // Performance tracking
  trackVirtualListPerformance: (metrics: {
    componentName: string;
    renderTime: number;
    scrollEvents: number;
    memoryUsage?: number;
    visibleItems: number;
    totalItems: number;
    containerHeight: number;
    itemHeight: number;
  }) => {
    safeCapture("virtual_list_performance", {
      ...metrics,
      timestamp: getTimestamp(),
    });
  },

  trackTablePerformance: (metrics: {
    type?: string;
    componentName: string;
    renderTime: number;
    scrollEvents: number;
    memoryUsage?: number;
    visibleRows: number;
    totalRows: number;
    sortTime?: number;
    filterTime?: number;
  }) => {
    safeCapture("table_performance", {
      ...metrics,
      timestamp: getTimestamp(),
    });
  },

  // Test helpers
  setPosthogClientForTesting: (_client: any) => {
    // For testing purposes
  },

  resetPosthogClientForTesting: () => {
    // For testing purposes
  },
};
