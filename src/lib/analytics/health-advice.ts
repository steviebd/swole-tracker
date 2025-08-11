import { analytics } from '~/lib/analytics';
import posthog from 'posthog-js';

interface HealthAdviceUsageMetrics {
  sessionId: string;
  readiness: number; // 0-1
  overloadMultiplier: number; // 0.9-1.1
  userAcceptedSuggestions: number; // Count of accepted suggestions
  totalSuggestions: number; // Total suggestions provided
  modelUsed: string; // AI model identifier
  responseTime?: number; // API response time in ms
  hasWhoopData: boolean;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  flags?: string[]; // Readiness flags
  warnings?: string[]; // Any warnings shown to user
}

interface HealthAdviceErrorMetrics {
  sessionId: string;
  errorType: 'api_error' | 'validation_error' | 'ai_generation_error' | 'network_error';
  errorMessage: string;
  modelUsed?: string;
  hasWhoopData: boolean;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export function trackHealthAdviceUsage({
  sessionId,
  readiness,
  overloadMultiplier,
  userAcceptedSuggestions,
  totalSuggestions,
  modelUsed,
  responseTime,
  hasWhoopData,
  experienceLevel,
  flags = [],
  warnings = []
}: HealthAdviceUsageMetrics) {
  const acceptanceRate = totalSuggestions > 0 ? userAcceptedSuggestions / totalSuggestions : 0;
  
  // PostHog event tracking
  if (typeof window !== 'undefined') {
    posthog.capture('health_advice_used', {
      session_id: sessionId,
      readiness_score: readiness,
      overload_multiplier: overloadMultiplier,
      accepted_suggestions: userAcceptedSuggestions,
      total_suggestions: totalSuggestions,
      acceptance_rate: acceptanceRate,
      model_used: modelUsed,
      response_time_ms: responseTime,
      has_whoop_data: hasWhoopData,
      experience_level: experienceLevel,
      readiness_flags: flags,
      warnings_count: warnings.length,
      has_warnings: warnings.length > 0
    });
  }

  // Analytics module logging (for server-side or debugging)
  analytics.featureUsed('health_advice', {
    sessionId,
    readiness,
    overloadMultiplier,
    acceptanceRate,
    modelUsed,
    hasWhoopData,
    experienceLevel,
    flagsCount: flags.length,
    warningsCount: warnings.length
  });
}

export function trackHealthAdviceError({
  sessionId,
  errorType,
  errorMessage,
  modelUsed,
  hasWhoopData,
  experienceLevel
}: HealthAdviceErrorMetrics) {
  // PostHog error tracking
  if (typeof window !== 'undefined') {
    posthog.capture('health_advice_error', {
      session_id: sessionId,
      error_type: errorType,
      error_message: errorMessage,
      model_used: modelUsed,
      has_whoop_data: hasWhoopData,
      experience_level: experienceLevel
    });
  }

  // Analytics module error logging
  analytics.error(new Error(errorMessage), {
    context: 'health_advice',
    sessionId,
    errorType,
    modelUsed,
    hasWhoopData,
    experienceLevel
  });
}

export function trackSuggestionInteraction({
  sessionId,
  exerciseId,
  setId,
  action,
  suggestionType,
  originalValue,
  suggestedValue,
  acceptedValue
}: {
  sessionId: string;
  exerciseId: string;
  setId: string;
  action: 'accepted' | 'overridden' | 'ignored';
  suggestionType: 'weight' | 'reps';
  originalValue?: number;
  suggestedValue?: number;
  acceptedValue?: number;
}) {
  if (typeof window !== 'undefined') {
    posthog.capture('health_advice_suggestion_interaction', {
      session_id: sessionId,
      exercise_id: exerciseId,
      set_id: setId,
      action,
      suggestion_type: suggestionType,
      original_value: originalValue,
      suggested_value: suggestedValue,
      accepted_value: acceptedValue,
      suggestion_change_percent: originalValue && suggestedValue ? 
        ((suggestedValue - originalValue) / originalValue) * 100 : null
    });
  }
}

export function trackReadinessThreshold({
  sessionId,
  readiness,
  wasBlocked,
  safetyCapApplied,
  experienceLevel
}: {
  sessionId: string;
  readiness: number;
  wasBlocked: boolean;
  safetyCapApplied: boolean;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}) {
  if (typeof window !== 'undefined') {
    posthog.capture('health_advice_safety_check', {
      session_id: sessionId,
      readiness_score: readiness,
      was_blocked: wasBlocked,
      safety_cap_applied: safetyCapApplied,
      experience_level: experienceLevel,
      readiness_category: readiness >= 0.8 ? 'high' : 
                         readiness >= 0.6 ? 'medium' : 
                         readiness >= 0.35 ? 'low' : 'very_low'
    });
  }

  if (wasBlocked) {
    analytics.featureUsed('health_advice_blocked', {
      sessionId,
      readiness,
      experienceLevel,
      reason: 'low_readiness'
    });
  }

  if (safetyCapApplied) {
    analytics.featureUsed('health_advice_safety_cap', {
      sessionId,
      readiness,
      experienceLevel,
      reason: 'beginner_cap'
    });
  }
}

// Performance monitoring for health advice API
export function trackHealthAdvicePerformance({
  sessionId,
  totalDuration,
  aiGenerationTime,
  serverProcessingTime,
  modelUsed,
  inputSize,
  outputSize
}: {
  sessionId: string;
  totalDuration: number; // Total request time in ms
  aiGenerationTime?: number; // Time spent on AI generation
  serverProcessingTime?: number; // Time spent on server processing
  modelUsed: string;
  inputSize?: number; // Size of input payload in bytes
  outputSize?: number; // Size of output payload in bytes
}) {
  if (typeof window !== 'undefined') {
    posthog.capture('health_advice_performance', {
      session_id: sessionId,
      total_duration_ms: totalDuration,
      ai_generation_time_ms: aiGenerationTime,
      server_processing_time_ms: serverProcessingTime,
      model_used: modelUsed,
      input_size_bytes: inputSize,
      output_size_bytes: outputSize,
      performance_rating: totalDuration < 300 ? 'excellent' :
                         totalDuration < 1000 ? 'good' :
                         totalDuration < 3000 ? 'acceptable' : 'poor'
    });
  }

  // Log slow responses
  if (totalDuration > 3000) {
    analytics.featureUsed('health_advice_slow_response', {
      sessionId,
      totalDuration,
      modelUsed,
      aiGenerationTime,
      serverProcessingTime,
      performance_issue: 'slow_response'
    });
  }
}

// Weekly/monthly aggregation helpers for analytics dashboards
export function getHealthAdviceMetrics() {
  // This would be used in analytics dashboards to show:
  // - Average readiness scores
  // - Suggestion acceptance rates by experience level
  // - Most common warnings/flags
  // - Performance metrics by model
  // - Safety cap trigger frequency
  
  return {
    // Implementation would depend on your analytics backend
    // Could pull from PostHog, database, or other sources
  };
}