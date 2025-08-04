import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCaller, createMockDb, createMockUser } from './trpc-harness';

// Ensure required public env vars exist BEFORE importing modules that may load src/env.js
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

// We will mock db.workouts namespace methods that our procedures use.
// Adjust method names to the actual implementation if needed after first run.

describe('tRPC workouts router (integration, mocked ctx/db)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('workouts.getRecent returns empty array for a new user', async () => {
    const user = createMockUser(true);
    const db = createMockDb({
      query: {
        workoutSessions: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const trpc = buildCaller({ db, user });
    const res = await (trpc as any).workouts?.getRecent?.({ limit: 10 });
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);

    const findMany = (db as any).query?.workoutSessions?.findMany;
    expect(findMany).toHaveBeenCalled();
  });

  it('workouts.start creates a session and returns template', async () => {
    const user = createMockUser(true);
    const template = {
      id: 1,
      user_id: user!.id,
      exercises: [],
    };
    const session = { id: 123, user_id: user!.id, templateId: 1, workoutDate: new Date() };

    const db = createMockDb({
      query: {
        workoutTemplates: {
          findFirst: vi.fn().mockResolvedValue(template),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([session]),
      }),
    });

    const trpc = buildCaller({ db, user });
    const input = { templateId: 1, workoutDate: new Date() };
    const created = await (trpc as any).workouts?.start?.(input);

    expect(created?.sessionId).toBe(session.id);
    expect(created?.template).toEqual(template);
    expect((db as any).insert).toHaveBeenCalled();
  });

  it('workouts.getRecent requires auth for protected route', async () => {
    const db = createMockDb({
      query: { workoutSessions: { findMany: vi.fn() } },
    });

    // Build caller with no user and call getRecent; protectedProcedure should throw
    await expect(async () => {
      const trpc = buildCaller({ db, user: createMockUser(false) });
      // return the awaited promise so Vitest can catch the rejection
      return await (trpc as any).workouts?.getRecent?.({ limit: 5 });
    }).rejects.toMatchObject({ name: 'TRPCError' });
  });
});
