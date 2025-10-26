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
};
