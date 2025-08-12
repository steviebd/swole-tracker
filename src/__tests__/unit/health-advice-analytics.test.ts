import { describe, test, expect, vi } from 'vitest';
import * as healthAdviceAnalytics from '~/lib/analytics/health-advice';
import { analytics } from '~/lib/analytics';

// Mock the analytics module FIRST
vi.mock('~/lib/analytics', async () => {
  const actual = await vi.importActual('~/lib/analytics');
  return {
    ...actual,
    analytics: {
      featureUsed: vi.fn(),
      error: vi.fn()
    }
  };
});

// Mock the posthog-js module
vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
    init: vi.fn(),
  }
}));

describe('Health Advice Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window object for client-side tests
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          hostname: 'localhost',
          host: 'localhost',
          origin: 'http://localhost',
          href: 'http://localhost/',
          protocol: 'http:',
          search: '',
          hash: ''
        }
      },
      writable: true
    });
  });

  afterEach(() => {
    // Clean up window mock
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true
    });
  });

  // Helper to get the mock PostHog instance
  const getMockPostHog = async () => {
    // We need to access the actual mock from the module
    const posthogModule = await import('posthog-js');
    return posthogModule.default;
  };

  describe('trackHealthAdviceUsage', () => {
    test('tracks usage with PostHog and analytics module', async () => {
      const usageData = {
        sessionId: 'test-session-123',
        readiness: 0.85,
        overloadMultiplier: 1.05,
        userAcceptedSuggestions: 3,
        totalSuggestions: 5,
        modelUsed: 'gpt-4o-mini',
        responseTime: 150,
        hasWhoopData: true,
        experienceLevel: 'intermediate' as const,
        flags: ['good_recovery', 'good_sleep'],
        warnings: ['light_strain_yesterday']
      };

      healthAdviceAnalytics.trackHealthAdviceUsage(usageData);

      const mockPostHog = await getMockPostHog();

      // Check PostHog capture was called
      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_used', {
        session_id: 'test-session-123',
        readiness_score: 0.85,
        overload_multiplier: 1.05,
        accepted_suggestions: 3,
        total_suggestions: 5,
        acceptance_rate: 0.6,
        model_used: 'gpt-4o-mini',
        response_time_ms: 150,
        has_whoop_data: true,
        experience_level: 'intermediate',
        readiness_flags: ['good_recovery', 'good_sleep'],
        warnings_count: 1,
        has_warnings: true
      });

      // Check analytics.featureUsed was called
      expect(analytics.featureUsed).toHaveBeenCalledWith('health_advice', {
        sessionId: 'test-session-123',
        readiness: 0.85,
        overloadMultiplier: 1.05,
        acceptanceRate: 0.6,
        modelUsed: 'gpt-4o-mini',
        hasWhoopData: true,
        experienceLevel: 'intermediate',
        flagsCount: 2,
        warningsCount: 1
      });
    });

    test('handles zero total suggestions', async () => {
      const usageData = {
        sessionId: 'test-session-456',
        readiness: 0.75,
        overloadMultiplier: 1.0,
        userAcceptedSuggestions: 0,
        totalSuggestions: 0,
        modelUsed: 'gpt-4o-mini',
        hasWhoopData: false,
        experienceLevel: 'beginner' as const
      };

      healthAdviceAnalytics.trackHealthAdviceUsage(usageData);

      const mockPostHog = await getMockPostHog();

      // Check acceptance rate is 0 when no suggestions
      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_used', expect.objectContaining({
        acceptance_rate: 0,
        has_warnings: false,
        warnings_count: 0
      }));
    });

    test('works without optional parameters', async () => {
      const usageData = {
        sessionId: 'test-session-789',
        readiness: 0.9,
        overloadMultiplier: 1.1,
        userAcceptedSuggestions: 2,
        totalSuggestions: 4,
        modelUsed: 'gpt-4',
        hasWhoopData: true,
        experienceLevel: 'advanced' as const
        // No flags or warnings
      };

      healthAdviceAnalytics.trackHealthAdviceUsage(usageData);

      const mockPostHog = await getMockPostHog();

      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_used', expect.objectContaining({
        session_id: 'test-session-789',
        readiness_flags: [],
        warnings_count: 0,
        has_warnings: false
      }));
    });
  });

  describe('trackHealthAdviceError', () => {
    test('tracks errors with PostHog and analytics module', async () => {
      const errorData = {
        sessionId: 'test-session-error-123',
        errorType: 'ai_generation_error' as const,
        errorMessage: 'Failed to generate response',
        modelUsed: 'gpt-4o-mini',
        hasWhoopData: true,
        experienceLevel: 'intermediate' as const
      };

      healthAdviceAnalytics.trackHealthAdviceError(errorData);

      const mockPostHog = await getMockPostHog();

      // Check PostHog capture was called
      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_error', {
        session_id: 'test-session-error-123',
        error_type: 'ai_generation_error',
        error_message: 'Failed to generate response',
        model_used: 'gpt-4o-mini',
        has_whoop_data: true,
        experience_level: 'intermediate'
      });

      // Check analytics.error was called
      expect(analytics.error).toHaveBeenCalledWith(
        new Error('Failed to generate response'),
        {
          context: 'health_advice',
          sessionId: 'test-session-error-123',
          errorType: 'ai_generation_error',
          modelUsed: 'gpt-4o-mini',
          hasWhoopData: true,
          experienceLevel: 'intermediate'
        }
      );
    });

    test('works without optional parameters', async () => {
      const errorData = {
        sessionId: 'test-session-error-456',
        errorType: 'network_error' as const,
        errorMessage: 'Network timeout',
        hasWhoopData: false
        // No modelUsed or experienceLevel
      };

      healthAdviceAnalytics.trackHealthAdviceError(errorData);

      const mockPostHog = await getMockPostHog();

      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_error', {
        session_id: 'test-session-error-456',
        error_type: 'network_error',
        error_message: 'Network timeout',
        model_used: undefined,
        has_whoop_data: false,
        experience_level: undefined
      });
    });
  });

  describe('trackSuggestionInteraction', () => {
    test('tracks suggestion interactions with PostHog', async () => {
      const interactionData = {
        sessionId: 'test-session-interact-123',
        exerciseId: 'bench_press',
        setId: 'set_1',
        action: 'accepted' as const,
        suggestionType: 'weight' as const,
        originalValue: 80,
        suggestedValue: 82.5,
        acceptedValue: 82.5
      };

      healthAdviceAnalytics.trackSuggestionInteraction(interactionData);

      const mockPostHog = await getMockPostHog();

      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_suggestion_interaction', {
        session_id: 'test-session-interact-123',
        exercise_id: 'bench_press',
        set_id: 'set_1',
        action: 'accepted',
        suggestion_type: 'weight',
        original_value: 80,
        suggested_value: 82.5,
        accepted_value: 82.5,
        suggestion_change_percent: 3.125
      });
    });

    test('handles missing values in percentage calculation', async () => {
      const interactionData = {
        sessionId: 'test-session-interact-456',
        exerciseId: 'squat',
        setId: 'set_2',
        action: 'ignored' as const,
        suggestionType: 'reps' as const
        // No originalValue or suggestedValue
      };

      healthAdviceAnalytics.trackSuggestionInteraction(interactionData);

      const mockPostHog = await getMockPostHog();

      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_suggestion_interaction', {
        session_id: 'test-session-interact-456',
        exercise_id: 'squat',
        set_id: 'set_2',
        action: 'ignored',
        suggestion_type: 'reps',
        original_value: undefined,
        suggested_value: undefined,
        accepted_value: undefined,
        suggestion_change_percent: null
      });
    });
  });

  describe('trackReadinessThreshold', () => {
    test('tracks readiness thresholds and safety checks', async () => {
      const thresholdData = {
        sessionId: 'test-session-threshold-123',
        readiness: 0.85,
        wasBlocked: false,
        safetyCapApplied: true,
        experienceLevel: 'beginner' as const
      };

      healthAdviceAnalytics.trackReadinessThreshold(thresholdData);

      const mockPostHog = await getMockPostHog();

      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_safety_check', {
        session_id: 'test-session-threshold-123',
        readiness_score: 0.85,
        was_blocked: false,
        safety_cap_applied: true,
        experience_level: 'beginner',
        readiness_category: 'high'
      });

      expect(analytics.featureUsed).toHaveBeenCalledWith('health_advice_safety_cap', {
        sessionId: 'test-session-threshold-123',
        readiness: 0.85,
        experienceLevel: 'beginner',
        reason: 'beginner_cap'
      });
    });

    test('tracks blocked sessions', async () => {
      const thresholdData = {
        sessionId: 'test-session-threshold-blocked',
        readiness: 0.3,
        wasBlocked: true,
        safetyCapApplied: false,
        experienceLevel: 'intermediate' as const
      };

      healthAdviceAnalytics.trackReadinessThreshold(thresholdData);

      const mockPostHog = await getMockPostHog();

      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_safety_check', {
        session_id: 'test-session-threshold-blocked',
        readiness_score: 0.3,
        was_blocked: true,
        safety_cap_applied: false,
        experience_level: 'intermediate',
        readiness_category: 'very_low'
      });

      expect(analytics.featureUsed).toHaveBeenCalledWith('health_advice_blocked', {
        sessionId: 'test-session-threshold-blocked',
        readiness: 0.3,
        experienceLevel: 'intermediate',
        reason: 'low_readiness'
      });
    });

    test('categorizes different readiness levels', async () => {
      const testCases = [
        { readiness: 0.9, category: 'high' },
        { readiness: 0.7, category: 'medium' },
        { readiness: 0.5, category: 'low' },
        { readiness: 0.2, category: 'very_low' }
      ];

      for (const { readiness, category } of testCases) {
        const mockPostHog = await getMockPostHog();
        
        
        healthAdviceAnalytics.trackReadinessThreshold({
          sessionId: 'test-session',
          readiness,
          wasBlocked: false,
          safetyCapApplied: false,
          experienceLevel: 'intermediate'
        });

        expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_safety_check', 
          expect.objectContaining({
            readiness_category: category
          })
        );
      }
    });
  });

  describe('trackHealthAdvicePerformance', () => {
    test('tracks performance metrics', async () => {
      const performanceData = {
        sessionId: 'test-session-perf-123',
        totalDuration: 1200,
        aiGenerationTime: 800,
        serverProcessingTime: 400,
        modelUsed: 'gpt-4o-mini',
        inputSize: 1024,
        outputSize: 2048
      };

      healthAdviceAnalytics.trackHealthAdvicePerformance(performanceData);

      const mockPostHog = await getMockPostHog();

      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_performance', {
        session_id: 'test-session-perf-123',
        total_duration_ms: 1200,
        ai_generation_time_ms: 800,
        server_processing_time_ms: 400,
        model_used: 'gpt-4o-mini',
        input_size_bytes: 1024,
        output_size_bytes: 2048,
        performance_rating: 'acceptable'
      });
    });

    test('categorizes performance ratings', async () => {
      const testCases = [
        { duration: 200, rating: 'excellent' },
        { duration: 500, rating: 'good' },
        { duration: 2000, rating: 'acceptable' },
        { duration: 5000, rating: 'poor' }
      ];

      for (const { duration, rating } of testCases) {
        const mockPostHog = await getMockPostHog();
        
        analytics.featureUsed.mockClear();
        
        healthAdviceAnalytics.trackHealthAdvicePerformance({
          sessionId: 'test-session',
          totalDuration: duration,
          modelUsed: 'gpt-4o-mini'
        });

        expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_performance', 
          expect.objectContaining({
            performance_rating: rating
          })
        );
      }
    });

    test('tracks slow responses', async () => {
      healthAdviceAnalytics.trackHealthAdvicePerformance({
        sessionId: 'test-session-slow',
        totalDuration: 4000, // 4 seconds - slow
        modelUsed: 'gpt-4o-mini',
        aiGenerationTime: 3500,
        serverProcessingTime: 500
      });

      expect(analytics.featureUsed).toHaveBeenCalledWith('health_advice_slow_response', {
        sessionId: 'test-session-slow',
        totalDuration: 4000,
        modelUsed: 'gpt-4o-mini',
        aiGenerationTime: 3500,
        serverProcessingTime: 500,
        performance_issue: 'slow_response'
      });
    });

    test('handles missing optional parameters', async () => {
      healthAdviceAnalytics.trackHealthAdvicePerformance({
        sessionId: 'test-session-minimal',
        totalDuration: 300,
        modelUsed: 'gpt-4'
        // Missing optional times and sizes
      });

      const mockPostHog = await getMockPostHog();

      expect(mockPostHog.capture).toHaveBeenCalledWith('health_advice_performance', {
        session_id: 'test-session-minimal',
        total_duration_ms: 300,
        ai_generation_time_ms: undefined,
        server_processing_time_ms: undefined,
        model_used: 'gpt-4',
        input_size_bytes: undefined,
        output_size_bytes: undefined,
        performance_rating: 'good'
      });
    });
  });

  describe('getHealthAdviceMetrics', () => {
    test('returns metrics object', async () => {
      const metrics = healthAdviceAnalytics.getHealthAdviceMetrics();
      expect(metrics).toEqual({});
    });
  });

  describe('Server-side behavior', () => {
    test('does not call PostHog when window is undefined (server-side)', async () => {
      // Remove window object to simulate server-side
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      });

      const usageData = {
        sessionId: 'test-session-server',
        readiness: 0.85,
        overloadMultiplier: 1.05,
        userAcceptedSuggestions: 3,
        totalSuggestions: 5,
        modelUsed: 'gpt-4o-mini',
        hasWhoopData: true,
        experienceLevel: 'intermediate' as const
      };

      healthAdviceAnalytics.trackHealthAdviceUsage(usageData);

      const mockPostHog = await getMockPostHog();

      // PostHog should not be called on server-side
      expect(mockPostHog.capture).not.toHaveBeenCalled();
      
      // But analytics.module should still be called
      expect(analytics.featureUsed).toHaveBeenCalledWith('health_advice', expect.any(Object));
    });
  });
});