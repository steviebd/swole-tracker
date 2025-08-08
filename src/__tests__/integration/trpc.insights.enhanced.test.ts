import './setup.debug-errors';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCaller, createMockDb, createMockUser } from './trpc-harness';

// Seed public env
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

describe('tRPC insights router enhanced branch coverage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('getExerciseInsights edge cases', () => {
    it('should handle linked exercises via master linking path', async () => {
      const user = createMockUser(true);
      
      const mockLink = {
        templateExerciseId: 1,
        masterExerciseId: 100,
        user_id: user!.id,
        masterExercise: { id: 100, name: 'Bench Press', normalizedName: 'bench press' }
      };

      const mockLinkedExercises = [
        { templateExerciseId: 1, templateExercise: { exerciseName: 'Bench Press' } },
        { templateExerciseId: 2, templateExercise: { exerciseName: 'Incline Bench' } }
      ];

      const mockSession = {
        id: 1,
        user_id: user!.id,
        workoutDate: new Date('2024-01-01'),
        exercises: [
          {
            exerciseName: 'Bench Press',
            templateExerciseId: 1,
            weight: 100,
            reps: 8,
            sets: 3,
            unit: 'kg',
            rpe: 8,
            rest_seconds: 120,
            setOrder: 1
          }
        ]
      };

      const db = createMockDb({
        query: {
          exerciseLinks: {
            findFirst: vi.fn().mockResolvedValue(mockLink),
            findMany: vi.fn().mockResolvedValue(mockLinkedExercises),
          },
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue([mockSession]),
          },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Bench Press',
        templateExerciseId: 1,
        unit: 'kg',
        limitSessions: 10,
      });

      expect(result).toBeDefined();
      expect(result.bestSet?.weight).toBe(100);
      expect(result.best1RM).toBeGreaterThan(100);
      expect(db.query.exerciseLinks.findMany).toHaveBeenCalled();
    });

    it('should handle weight progression recommendations for kg', async () => {
      const user = createMockUser(true);
      
      const sessions = [
        {
          id: 1,
          user_id: user!.id,
          workoutDate: new Date('2024-01-01'),
          exercises: [{ exerciseName: 'Squat', weight: 100, reps: 8, unit: 'kg', setOrder: 1 }]
        },
        {
          id: 2,
          user_id: user!.id,
          workoutDate: new Date('2024-01-05'),
          exercises: [{ exerciseName: 'Squat', weight: 102.5, reps: 8, unit: 'kg', setOrder: 1 }]
        },
        {
          id: 3,
          user_id: user!.id,
          workoutDate: new Date('2024-01-10'),
          exercises: [{ exerciseName: 'Squat', weight: 105, reps: 8, unit: 'kg', setOrder: 1 }]
        }
      ];

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue(sessions) },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Squat',
        unit: 'kg',
      });

      expect(result.recommendation?.type).toBe('weight');
      expect(result.recommendation?.rationale).toContain('Upward trend');
      expect(result.recommendation?.unit).toBe('kg');
    });

    it('should handle weight progression recommendations for lbs', async () => {
      const user = createMockUser(true);
      
      const sessions = [
        {
          id: 1,
          user_id: user!.id,
          workoutDate: new Date('2024-01-01'),
          exercises: [{ exerciseName: 'Deadlift', weight: 225, reps: 5, unit: 'lbs', setOrder: 1 }]
        },
        {
          id: 2,
          user_id: user!.id,
          workoutDate: new Date('2024-01-05'),
          exercises: [{ exerciseName: 'Deadlift', weight: 235, reps: 5, unit: 'lbs', setOrder: 1 }]
        }
      ];

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue(sessions) },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Deadlift',
        unit: 'lbs',
      });

      expect(result.recommendation?.type).toBe('weight');
      expect(result.recommendation?.rationale).toContain('+5 lb');
      expect(result.recommendation?.unit).toBe('lbs');
    });

    it('should suggest reps progression when weight plateaus', async () => {
      const user = createMockUser(true);
      
      const sessions = [
        {
          id: 1,
          user_id: user!.id,
          workoutDate: new Date('2024-01-01'),
          exercises: [{ exerciseName: 'Press', weight: 60, reps: 5, unit: 'kg', setOrder: 1 }]
        },
        {
          id: 2,
          user_id: user!.id,
          workoutDate: new Date('2024-01-05'),
          exercises: [{ exerciseName: 'Press', weight: 55, reps: 5, unit: 'kg', setOrder: 1 }]
        }
      ];

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue(sessions) },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Press',
        unit: 'kg',
      });

      expect(result.recommendation?.type).toBe('reps');
      expect(result.recommendation?.rationale).toContain('Plateau detected');
    });

    it('should generate RPE suggestions for high average RPE', async () => {
      const user = createMockUser(true);
      
      const session = {
        id: 1,
        user_id: user!.id,
        workoutDate: new Date('2024-01-01'),
        exercises: [
          { exerciseName: 'Row', weight: 80, reps: 8, unit: 'kg', rpe: 9.5, setOrder: 1 },
          { exerciseName: 'Row', weight: 80, reps: 7, unit: 'kg', rpe: 9, setOrder: 2 },
          { exerciseName: 'Row', weight: 80, reps: 6, unit: 'kg', rpe: 9.5, setOrder: 3 }
        ]
      };

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue([session]) },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Row',
        unit: 'kg',
      });

      expect(result.suggestions).toContainEqual({
        kind: 'rpe',
        message: expect.stringContaining('high (≥9)')
      });
    });

    it('should generate RPE suggestions for low average RPE', async () => {
      const user = createMockUser(true);
      
      const session = {
        id: 1,
        user_id: user!.id,
        workoutDate: new Date('2024-01-01'),
        exercises: [
          { exerciseName: 'Curl', weight: 20, reps: 12, unit: 'kg', rpe: 6, setOrder: 1 },
          { exerciseName: 'Curl', weight: 20, reps: 12, unit: 'kg', rpe: 5, setOrder: 2 },
          { exerciseName: 'Curl', weight: 20, reps: 12, unit: 'kg', rpe: 6, setOrder: 3 }
        ]
      };

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue([session]) },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Curl',
        unit: 'kg',
      });

      expect(result.suggestions).toContainEqual({
        kind: 'rpe',
        message: expect.stringContaining('low (≤6)')
      });
    });

    it('should generate rest suggestions for short rest periods', async () => {
      const user = createMockUser(true);
      
      const session = {
        id: 1,
        user_id: user!.id,
        workoutDate: new Date('2024-01-01'),
        exercises: [
          { exerciseName: 'Sprint', weight: 0, reps: 10, unit: 'kg', rest_seconds: 45, setOrder: 1 },
          { exerciseName: 'Sprint', weight: 0, reps: 10, unit: 'kg', rest_seconds: 50, setOrder: 2 },
          { exerciseName: 'Sprint', weight: 0, reps: 10, unit: 'kg', rest_seconds: 30, setOrder: 3 }
        ]
      };

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue([session]) },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Sprint',
        unit: 'kg',
      });

      expect(result.suggestions).toContainEqual({
        kind: 'rest',
        message: expect.stringContaining('short (<60s)')
      });
    });

    it('should generate rest suggestions for long rest periods', async () => {
      const user = createMockUser(true);
      
      const session = {
        id: 1,
        user_id: user!.id,
        workoutDate: new Date('2024-01-01'),
        exercises: [
          { exerciseName: 'Heavy Squat', weight: 150, reps: 3, unit: 'kg', rest_seconds: 240, setOrder: 1 },
          { exerciseName: 'Heavy Squat', weight: 150, reps: 3, unit: 'kg', rest_seconds: 300, setOrder: 2 },
          { exerciseName: 'Heavy Squat', weight: 150, reps: 3, unit: 'kg', rest_seconds: 200, setOrder: 3 }
        ]
      };

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue([session]) },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Heavy Squat',
        unit: 'kg',
      });

      expect(result.suggestions).toContainEqual({
        kind: 'rest',
        message: expect.stringContaining('long (>180s)')
      });
    });

    it('should generate volume suggestions for declining trend', async () => {
      const user = createMockUser(true);
      
      const sessions = [
        {
          id: 1,
          user_id: user!.id,
          workoutDate: new Date('2024-01-01'),
          exercises: [{ exerciseName: 'Pullup', weight: 10, reps: 10, unit: 'kg', setOrder: 1 }]
        },
        {
          id: 2,
          user_id: user!.id,
          workoutDate: new Date('2024-01-05'),
          exercises: [{ exerciseName: 'Pullup', weight: 8, reps: 8, unit: 'kg', setOrder: 1 }]
        },
        {
          id: 3,
          user_id: user!.id,
          workoutDate: new Date('2024-01-10'),
          exercises: [{ exerciseName: 'Pullup', weight: 5, reps: 6, unit: 'kg', setOrder: 1 }]
        }
      ];

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue(sessions) },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Pullup',
        unit: 'kg',
      });

      expect(result.suggestions).toContainEqual({
        kind: 'volume',
        message: expect.stringContaining('trending flat/down')
      });
    });

    it('should handle excludeSessionId filter', async () => {
      const user = createMockUser(true);
      
      const sessions = [
        {
          id: 1,
          user_id: user!.id,
          workoutDate: new Date('2024-01-01'),
          exercises: [{ exerciseName: 'Test', weight: 50, reps: 10, unit: 'kg', setOrder: 1 }]
        },
        {
          id: 2,
          user_id: user!.id,
          workoutDate: new Date('2024-01-05'),
          exercises: [{ exerciseName: 'Test', weight: 100, reps: 5, unit: 'kg', setOrder: 1 }]
        }
      ];

      const db = createMockDb({
        query: {
          exerciseLinks: { findFirst: vi.fn().mockResolvedValue(null) },
          templateExercises: { findFirst: vi.fn().mockResolvedValue(null) },
          workoutSessions: { findMany: vi.fn().mockResolvedValue([sessions[0]]) }, // Only return first session
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getExerciseInsights({
        exerciseName: 'Test',
        unit: 'kg',
        excludeSessionId: 2, // Should exclude session 2
      });

      expect(result).toBeDefined();
      expect(result.volumeSparkline).toHaveLength(1);
    });
  });

  describe('getSessionInsights edge cases', () => {
    it('should aggregate multiple exercises correctly', async () => {
      const user = createMockUser(true);
      
      const mockSession = {
        id: 1,
        user_id: user!.id,
        workoutDate: new Date('2024-01-01'),
        exercises: [
          { exerciseName: 'Bench', weight: 100, reps: 8, unit: 'kg' },
          { exerciseName: 'Bench', weight: 90, reps: 10, unit: 'kg' },
          { exerciseName: 'Squat', weight: 120, reps: 5, unit: 'kg' },
          { exerciseName: 'Squat', weight: 110, reps: 8, unit: 'kg' }
        ]
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.getSessionInsights({
        sessionId: 1,
        unit: 'kg',
      });

      expect(result.bestSets).toHaveLength(2);
      const benchSet = result.bestSets.find((s: any) => s.exerciseName === 'Bench');
      const squatSet = result.bestSets.find((s: any) => s.exerciseName === 'Squat');
      
      expect(benchSet?.bestSet?.weight).toBe(100); // Best weight for bench
      expect(squatSet?.bestSet?.weight).toBe(120); // Best weight for squat
      expect(result.totalVolume).toBeGreaterThan(0);
    });
  });

  describe('exportWorkoutsCSV edge cases', () => {
    it('should handle since date filter', async () => {
      const user = createMockUser(true);
      const sinceDate = new Date('2024-01-01');
      
      const sessions = [
        {
          id: 1,
          user_id: user!.id,
          workoutDate: new Date('2024-01-05'),
          exercises: [{ exerciseName: 'Test', weight: 50, reps: 10, unit: 'kg', setOrder: 1 }],
          template: { name: 'Push Day' }
        }
      ];

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(sessions),
          },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.exportWorkoutsCSV({
        since: sinceDate,
        limit: 50,
      });

      expect(result.content).toContain('Push Day');
      expect(result.filename).toBe('workouts_export.csv');
    });

    it('should handle exercises with optional fields', async () => {
      const user = createMockUser(true);
      
      const sessions = [
        {
          id: 1,
          user_id: user!.id,
          workoutDate: new Date('2024-01-05'),
          exercises: [{
            exerciseName: 'Complex Exercise',
            weight: 75.5,
            reps: 12,
            unit: 'kg',
            setOrder: 1,
            rpe: 8.5,
            rest_seconds: 90
          }],
          template: { name: 'Full Body' }
        }
      ];

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(sessions),
          },
        },
      });

      const trpc = buildCaller({ db, user });
      const result = await (trpc as any).insights?.exportWorkoutsCSV({
        limit: 10,
      });

      expect(result.content).toContain('8.5'); // RPE
      expect(result.content).toContain('90'); // rest_seconds
      expect(result.content).toContain('75.5'); // weight
    });
  });
});