import { describe, test, expect } from 'vitest';
import { calculateReadiness, calculateOverloadMultiplier } from '~/lib/health-calculations';
import { healthAdviceRequestSchema } from '~/server/api/schemas/health-advice';

describe('Health Advice Integration', () => {
  test('request schema validates correct input', () => {
    const validRequest = {
      session_id: 'test-123',
      user_profile: {
        experience_level: 'intermediate',
        min_increment_kg: 2.5,
        preferred_rpe: 8
      },
      whoop: {
        recovery_score: 75,
        sleep_performance: 80
      },
      workout_plan: {
        exercises: [{
          exercise_id: 'bench_press',
          name: 'Bench Press',
          tags: ['strength'],
          sets: [{
            set_id: 'set_1',
            target_reps: 5,
            target_weight_kg: 80
          }]
        }]
      },
      prior_bests: {
        by_exercise_id: {
          'bench_press': {
            best_total_volume_kg: 1200
          }
        }
      }
    };

    const result = healthAdviceRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('request schema rejects invalid experience level', () => {
    const invalidRequest = {
      session_id: 'test-123',
      user_profile: {
        experience_level: 'expert', // Invalid
      },
      whoop: {},
      workout_plan: { exercises: [] },
      prior_bests: { by_exercise_id: {} }
    };

    const result = healthAdviceRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  test('integrated readiness and overload calculation', () => {
    const whoopData = {
      recovery_score: 85,
      sleep_performance: 90,
      hrv_now_ms: 50,
      hrv_baseline_ms: 45,
      rhr_now_bpm: 52,
      rhr_baseline_bpm: 55
    };

    const { rho, flags } = calculateReadiness(whoopData);
    const multiplier = calculateOverloadMultiplier(rho, 'intermediate');

    expect(rho).toBeGreaterThan(0.7); // Good metrics should give high readiness
    expect(multiplier).toBeGreaterThan(1.0); // Should allow overload
    expect(flags).toContain('good_recovery');
    expect(flags).toContain('good_sleep');
  });

  test('beginner safety overrides high readiness', () => {
    const whoopData = {
      recovery_score: 95,
      sleep_performance: 95,
      hrv_now_ms: 60,
      hrv_baseline_ms: 45,
      rhr_now_bpm: 50,
      rhr_baseline_bpm: 60
    };

    const { rho } = calculateReadiness(whoopData);
    const multiplierBeginner = calculateOverloadMultiplier(rho, 'beginner');
    const multiplierAdvanced = calculateOverloadMultiplier(rho, 'advanced');

    expect(rho).toBeGreaterThan(0.8); // Excellent metrics
    expect(multiplierBeginner).toBeLessThanOrEqual(1.05); // Beginner cap
    expect(multiplierAdvanced).toBeGreaterThan(1.05); // Advanced can go higher
  });

  test('poor metrics block overload suggestions', () => {
    const poorWhoopData = {
      recovery_score: 25,
      sleep_performance: 20,
      hrv_now_ms: 30,
      hrv_baseline_ms: 50,
      rhr_now_bpm: 70,
      rhr_baseline_bpm: 55
    };

    const { rho, flags } = calculateReadiness(poorWhoopData);
    
    expect(rho).toBeLessThan(0.5); // Should be low readiness
    expect(flags).toContain('low_recovery');
    expect(flags).toContain('poor_sleep');
    
    // This would trigger the safety block in the API (rho < 0.35)
  });
});