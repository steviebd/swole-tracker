import { describe, test, expect, vi } from 'vitest';
import { buildCaller, createMockDb } from './trpc-harness';
import type { MockDb } from './trpc-harness';
import { healthAdvice } from '~/server/db/schema';
import type { HealthAdviceRequest, HealthAdviceResponse } from '~/server/api/schemas/health-advice';

describe('tRPC health advice router', () => {
  // Valid test data
  const validRequest: HealthAdviceRequest = {
    session_id: 'test-session-123',
    user_profile: {
      experience_level: 'intermediate',
      min_increment_kg: 2.5,
      preferred_rpe: 8
    },
    whoop: {
      recovery_score: 75,
      sleep_performance: 80,
      hrv_now_ms: 50,
      hrv_baseline_ms: 45,
      rhr_now_bpm: 52,
      rhr_baseline_bpm: 55
    },
    workout_plan: {
      exercises: [{
        exercise_id: 'bench_press',
        name: 'Bench Press',
        tags: ['strength'],
        sets: [{
          set_id: 'set_1',
          target_reps: 5,
          target_weight_kg: 80,
          target_rpe: 8
        }]
      }]
    },
    prior_bests: {
      by_exercise_id: {
        'bench_press': {
          best_total_volume_kg: 1200,
          best_e1rm_kg: 100
        }
      }
    }
  };

  const validResponse: HealthAdviceResponse = {
    session_id: 'test-session-123',
    readiness: {
      rho: 0.85,
      overload_multiplier: 1.05,
      flags: ['good_recovery', 'good_sleep']
    },
    per_exercise: [{
      exercise_id: 'bench_press',
      predicted_chance_to_beat_best: 0.75,
      planned_volume_kg: 400,
      best_volume_kg: 1200,
      sets: [{
        set_id: 'set_1',
        suggested_weight_kg: 82.5,
        suggested_reps: 5,
        rationale: 'Based on readiness score and progressive overload principles'
      }]
    }],
    session_predicted_chance: 0.75,
    summary: 'Good readiness for overload',
    warnings: []
  };

  test('save procedure - creates new health advice record', async () => {
    const mockDb = createMockDb({
      insert: vi.fn((table) => {
        if (table === healthAdvice) {
          return {
            values: vi.fn(() => ({
              onConflictDoUpdate: vi.fn(() => ({
                returning: vi.fn(async () => [{
                  id: 1,
                  user_id: 'user_test_123',
                  sessionId: 123,
                  request: validRequest,
                  response: validResponse,
                  readiness_rho: '0.85',
                  overload_multiplier: '1.05',
                  session_predicted_chance: '0.75',
                  user_accepted_suggestions: 0,
                  total_suggestions: 1,
                  response_time_ms: 150,
                  model_used: 'gpt-4o-mini',
                  createdAt: new Date()
                }])
              }))
            }))
          };
        }
        return {
          values: vi.fn(() => ({
            returning: vi.fn(async () => [])
          }))
        };
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.save({
      sessionId: 123,
      request: validRequest,
      response: validResponse,
      responseTimeMs: 150,
      modelUsed: 'gpt-4o-mini'
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.sessionId).toBe(123);
    expect(result.user_id).toBe('user_test_123');
    expect(result.total_suggestions).toBe(1);
    expect(result.response_time_ms).toBe(150);
    expect(result.model_used).toBe('gpt-4o-mini');
  });

  test('save procedure - handles missing optional fields', async () => {
    const mockDb = createMockDb({
      insert: vi.fn((table) => {
        if (table === healthAdvice) {
          return {
            values: vi.fn(() => ({
              onConflictDoUpdate: vi.fn(() => ({
                returning: vi.fn(async () => [{
                  id: 1,
                  user_id: 'user_test_123',
                  sessionId: 123,
                  request: validRequest,
                  response: validResponse,
                  readiness_rho: '0.85',
                  overload_multiplier: '1.05',
                  session_predicted_chance: '0.75',
                  user_accepted_suggestions: 0,
                  total_suggestions: 1,
                  response_time_ms: null,
                  model_used: null,
                  createdAt: new Date()
                }])
              }))
            }))
          };
        }
        return {
          values: vi.fn(() => ({
            returning: vi.fn(async () => [])
          }))
        };
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.save({
      sessionId: 123,
      request: validRequest,
      response: validResponse
      // Missing optional responseTimeMs and modelUsed
    });

    expect(result).toBeDefined();
    expect(result.response_time_ms).toBeNull();
    expect(result.model_used).toBeNull();
  });

  test('getBySessionId procedure - returns health advice for session', async () => {
    const mockDb = createMockDb({
      select: vi.fn(() => {
        const chain = {
          from: vi.fn(() => chain),
          where: vi.fn(() => chain),
          limit: vi.fn(() => Promise.resolve([{
            id: 1,
            user_id: 'user_test_123',
            sessionId: 123,
            request: validRequest,
            response: validResponse,
            readiness_rho: '0.85',
            overload_multiplier: '1.05',
            session_predicted_chance: '0.75',
            user_accepted_suggestions: 2,
            total_suggestions: 3,
            response_time_ms: 150,
            model_used: 'gpt-4o-mini',
            createdAt: new Date()
          }]))
        };
        return chain;
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.getBySessionId({ sessionId: 123 });

    expect(result).toBeDefined();
    expect(result?.sessionId).toBe(123);
    expect(result?.user_accepted_suggestions).toBe(2);
    expect(result?.total_suggestions).toBe(3);
    expect(result?.response).toEqual(validResponse);
  });

  test('getBySessionId procedure - returns null when not found', async () => {
    const mockDb = createMockDb({
      select: vi.fn(() => {
        const chain = {
          from: vi.fn(() => chain),
          where: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          execute: vi.fn(async () => [])
        };
        return chain;
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.getBySessionId({ sessionId: 999 });

    expect(result).toBeNull();
  });

  test('getHistory procedure - returns user health advice history', async () => {
    const mockDb = createMockDb({
      select: vi.fn(() => {
        const chain = {
          from: vi.fn(() => chain),
          where: vi.fn(() => chain),
          orderBy: vi.fn(() => chain),
          limit: vi.fn(() => {
            const limitChain = {
              offset: vi.fn(() => Promise.resolve([
                    {
                      id: 1,
                      user_id: 'user_test_123',
                      sessionId: 123,
                      request: validRequest,
                      response: validResponse,
                      readiness_rho: '0.85',
                      overload_multiplier: '1.05',
                      session_predicted_chance: '0.75',
                      user_accepted_suggestions: 2,
                      total_suggestions: 3,
                      response_time_ms: 150,
                      model_used: 'gpt-4o-mini',
                      createdAt: new Date()
                    },
                    {
                      id: 2,
                      user_id: 'user_test_123',
                      sessionId: 124,
                      request: validRequest,
                      response: validResponse,
                      readiness_rho: '0.75',
                      overload_multiplier: '1.0',
                      session_predicted_chance: '0.65',
                      user_accepted_suggestions: 1,
                      total_suggestions: 2,
                      response_time_ms: 200,
                      model_used: 'gpt-4o-mini',
                      createdAt: new Date(Date.now() - 86400000) // 1 day ago
                    }
                  ]))
            };
            return limitChain;
          })
        };
        return chain;
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.getHistory({ limit: 10, offset: 0 });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]?.sessionId).toBe(123);
    expect(result[1]?.sessionId).toBe(124);
  });

  test('getHistory procedure - respects limit and offset', async () => {
    const mockDb = createMockDb({
      select: vi.fn(() => {
        const chain = {
          from: vi.fn(() => chain),
          where: vi.fn(() => chain),
          orderBy: vi.fn(() => chain),
          limit: vi.fn((limit: number) => {
            const limitChain = {
              offset: vi.fn((offset: number) => Promise.resolve(
                    // Return array with length matching limit
                    Array.from({ length: limit }, (_, i) => ({
                      id: i + 1,
                      user_id: 'user_test_123',
                      sessionId: 100 + i + offset,
                      request: validRequest,
                      response: validResponse,
                      readiness_rho: '0.85',
                      overload_multiplier: '1.05',
                      session_predicted_chance: '0.75',
                      user_accepted_suggestions: 0,
                      total_suggestions: 1,
                      response_time_ms: 150,
                      model_used: 'gpt-4o-mini',
                      createdAt: new Date()
                    }))
                  ))
            };
            return limitChain;
          })
        };
        return chain;
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.getHistory({ limit: 5, offset: 10 });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(5);
    // Check that the session IDs match the offset
    expect(result[0]?.sessionId).toBe(110);
    expect(result[4]?.sessionId).toBe(114);
  });

  test('updateAcceptedSuggestions procedure - updates accepted count', async () => {
    const mockDb = createMockDb({
      update: vi.fn(() => {
        const chain = {
          set: vi.fn(() => chain),
          where: vi.fn(() => chain),
          returning: vi.fn(async () => [{
            id: 1,
            user_id: 'user_test_123',
            sessionId: 123,
            request: validRequest,
            response: validResponse,
            readiness_rho: '0.85',
            overload_multiplier: '1.05',
            session_predicted_chance: '0.75',
            user_accepted_suggestions: 5,
            total_suggestions: 3,
            response_time_ms: 150,
            model_used: 'gpt-4o-mini',
            createdAt: new Date()
          }])
        };
        return chain;
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.updateAcceptedSuggestions({
      sessionId: 123,
      acceptedCount: 5
    });

    expect(result).toBeDefined();
    expect(result?.user_accepted_suggestions).toBe(5);
  });

  test('updateAcceptedSuggestions procedure - returns null when not found', async () => {
    const mockDb = createMockDb({
      update: vi.fn(() => {
        const chain = {
          set: vi.fn(() => chain),
          where: vi.fn(() => chain),
          returning: vi.fn(async () => [])
        };
        return chain;
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.updateAcceptedSuggestions({
      sessionId: 999,
      acceptedCount: 5
    });

    expect(result).toBeNull();
  });

  test('delete procedure - removes health advice record', async () => {
    const mockDb = createMockDb({
      delete: vi.fn(() => {
        const chain = {
          where: vi.fn(() => chain),
          returning: vi.fn(async () => [{
            id: 1,
            user_id: 'user_test_123',
            sessionId: 123,
            request: validRequest,
            response: validResponse,
            readiness_rho: '0.85',
            overload_multiplier: '1.05',
            session_predicted_chance: '0.75',
            user_accepted_suggestions: 0,
            total_suggestions: 1,
            response_time_ms: 150,
            model_used: 'gpt-4o-mini',
            createdAt: new Date()
          }])
        };
        return chain;
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.delete({ sessionId: 123 });

    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
    expect(result?.sessionId).toBe(123);
  });

  test('delete procedure - returns null when not found', async () => {
    const mockDb = createMockDb({
      delete: vi.fn(() => {
        const chain = {
          where: vi.fn(() => chain),
          returning: vi.fn(async () => [])
        };
        return chain;
      })
    }) as unknown as MockDb;

    const caller = buildCaller({ db: mockDb });
    
    const result = await caller.healthAdvice.delete({ sessionId: 999 });

    expect(result).toBeNull();
  });

  test('requires authentication for all procedures', async () => {
    const mockDb = createMockDb();
    const caller = buildCaller({ db: mockDb, user: null }); // No user = unauthenticated

    // Test that each procedure throws when unauthenticated
    await expect(
      caller.healthAdvice.save({
        sessionId: 123,
        request: validRequest,
        response: validResponse
      })
    ).rejects.toThrow();

    await expect(
      caller.healthAdvice.getBySessionId({ sessionId: 123 })
    ).rejects.toThrow();

    await expect(
      caller.healthAdvice.getHistory({ limit: 10 })
    ).rejects.toThrow();

    await expect(
      caller.healthAdvice.updateAcceptedSuggestions({
        sessionId: 123,
        acceptedCount: 5
      })
    ).rejects.toThrow();

    await expect(
      caller.healthAdvice.delete({ sessionId: 123 })
    ).rejects.toThrow();
  });
});