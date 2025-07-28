"use client";

import posthog from "posthog-js";

export const analytics = {
  // Page tracking
  pageView: (page: string, properties?: Record<string, unknown>) => {
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      page,
      ...properties,
    });
  },

  // Workout events
  workoutStarted: (templateId: string, templateName: string) => {
    posthog.capture("workout_started", {
      templateId,
      templateName,
      timestamp: new Date().toISOString(),
    });
  },

  workoutCompleted: (sessionId: string, duration: number, exerciseCount: number) => {
    posthog.capture("workout_completed", {
      sessionId,
      duration,
      exerciseCount,
      timestamp: new Date().toISOString(),
    });
  },

  exerciseLogged: (exerciseId: string, exerciseName: string, sets: number, weight?: number) => {
    posthog.capture("exercise_logged", {
      exerciseId,
      exerciseName,
      sets,
      weight,
      timestamp: new Date().toISOString(),
    });
  },

  // Template events
  templateCreated: (templateId: string, exerciseCount: number) => {
    posthog.capture("template_created", {
      templateId,
      exerciseCount,
      timestamp: new Date().toISOString(),
    });
  },

  templateDeleted: (templateId: string) => {
    posthog.capture("template_deleted", {
      templateId,
      timestamp: new Date().toISOString(),
    });
  },

  templateEdited: (templateId: string, exerciseCount: number) => {
    posthog.capture("template_edited", {
      templateId,
      exerciseCount,
      timestamp: new Date().toISOString(),
    });
  },

  // Settings events
  weightUnitChanged: (unit: "kg" | "lbs") => {
    posthog.capture("weight_unit_changed", {
      unit,
      timestamp: new Date().toISOString(),
    });
  },

  // Error tracking
  error: (error: Error, context?: Record<string, unknown>) => {
    posthog.capture("error", {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  },

  // Feature usage
  featureUsed: (feature: string, properties?: Record<string, unknown>) => {
    posthog.capture("feature_used", {
      feature,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },
};
