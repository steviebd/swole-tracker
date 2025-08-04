import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCaller, createMockDb, createMockUser } from './trpc-harness';

// Seed public env in case this file is evaluated directly first
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

describe('tRPC templates router (integration, mocked ctx/db)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getAll returns empty array for new user', async () => {
    const user = createMockUser(true);
    const db = createMockDb({
      query: {
        workoutTemplates: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const trpc = buildCaller({ db, user });
    const res = await (trpc as any).templates?.getAll?.();
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
    expect((db as any).query?.workoutTemplates?.findMany).toHaveBeenCalled();
  });

  it('create inserts template and links master exercises', async () => {
    const user = createMockUser(true);
    const insertedTemplate = { id: 42, user_id: user!.id, name: 'Push' };

    const insertedExercises = [
      { id: 1, user_id: user!.id, templateId: insertedTemplate.id, exerciseName: 'Bench Press', orderIndex: 0, linkingRejected: false },
      { id: 2, user_id: user!.id, templateId: insertedTemplate.id, exerciseName: 'Overhead Press', orderIndex: 1, linkingRejected: false },
    ];

    // Chainable builder helpers to match Drizzle insert/select APIs used in router
    const makeReturning = (value: unknown) => vi.fn().mockResolvedValue(value);
    const makeValues = (ret: unknown) => ({
      returning: makeReturning(ret),
    });

    // Select builder to support createAndLinkMasterExercise lookups:
    // db.select().from(masterExercises).where(...).limit(1)
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue([]), // force "no existing master exercise" so it inserts one
    });

    // Stateful insert mock that matches the router's expected call sequence:
    // 1) insert(workoutTemplates) -> returning [template]
    // 2) insert(templateExercises) -> returning insertedExercises
    // 3..N) insert(masterExercises) for each template exercise -> returning [{ id: 100 }]
    // Then insert(exerciseLinks) with onConflictDoUpdate chain for each link created.
    let insertCall = 0;
    const builder = (ret: unknown) => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(ret),
      }),
      returning: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue(ret),
      }),
    });
    // Drizzle's onConflictDoUpdate signature:
    // insert(table).values(vals).onConflictDoUpdate({ target, set })
    // Return an instance with a real method, not a plain literal, to avoid shape issues.
    class LinkInsertResult {
      onConflictDoUpdate = vi.fn().mockReturnValue(this);
    }
    // Factory that can return either a plain object with a function prop, or a class instance,
    // to cover differing adapter behaviors that read property descriptors differently.
    const makeLinkValuesReturn = () => {
      const inst = new LinkInsertResult();
      // Also expose as a plain function property to satisfy direct prop checks
      const plain: any = {};
      plain.onConflictDoUpdate = (...args: any[]) => (inst.onConflictDoUpdate as any)(...args);
      // Mirror potential chaining shapes
      plain.returning = vi.fn().mockReturnValue(plain);
      plain.values = vi.fn().mockReturnValue(plain);
      return { inst, plain };
    };

    const insertMock = vi.fn().mockImplementation((_table: any) => {
      insertCall += 1;
      // 1st call: create template
      if (insertCall === 1) {
        return builder([insertedTemplate]);
      }
      // 2nd call: insert template exercises
      if (insertCall === 2) {
        return builder(insertedExercises);
      }
      // 3rd and 4th calls: create master exercises for each inserted exercise
      if (insertCall === 3 || insertCall === 4) {
        return builder([{ id: 100 }]);
      }
      // Subsequent calls: create exercise links with onConflictDoUpdate directly on values()
      // Some Drizzle adapters may return the builder itself from values(); emulate both possibilities.
      const valuesFn = vi.fn().mockImplementation((_vals: any) => {
        const { inst, plain } = makeLinkValuesReturn();
        // Randomize between returning instance or plain to maximize compatibility
        // but keep deterministic by always returning the plain proxy (more permissive)
        return plain;
      });
      return { values: valuesFn };
    });

    const db = createMockDb({
      insert: insertMock as any,
      select: selectMock as any,
      // Provide a minimal query interface as used in the router elsewhere
      query: {
        workoutTemplates: {
          findMany: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(insertedTemplate),
        },
      },
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() }),
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockReturnThis() }),
    });

    const trpc = buildCaller({ db, user });
    const created = await (trpc as any).templates?.create?.({
      name: 'Push',
      exercises: ['Bench Press', 'Overhead Press'],
    });

    // The router destructures `[template]`; defend against potential shape differences
    expect(created).toBeTruthy();
    expect(created?.id).toBe(insertedTemplate.id);
    expect(created?.name).toBe(insertedTemplate.name);
    expect(insertMock).toHaveBeenCalled();
  });

  it('getAll requires auth', async () => {
    const db = createMockDb({
      query: { workoutTemplates: { findMany: vi.fn() } },
    });

    await expect(async () => {
      const trpc = buildCaller({ db, user: null });
      return await (trpc as any).templates?.getAll?.();
    }).rejects.toMatchObject({ name: 'TRPCError' });
  });
});
