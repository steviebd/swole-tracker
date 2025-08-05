import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCaller, createMockDb, createMockUser } from './trpc-harness';

// Seed public env in case this file is evaluated directly first
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= 'pk_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= 'phc_test_dummy';
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= 'https://us.i.posthog.com';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= 'supabase_test_key';

describe('tRPC preferences router (integration, mocked ctx/db)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('get returns default when none exists', async () => {
    const user = createMockUser(true);
    const db = createMockDb({
      query: {
        userPreferences: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const trpc = buildCaller({ db, user });
    const res = await (trpc as any).preferences?.get?.();

    expect(res).toEqual({ defaultWeightUnit: 'kg' });
    expect((db as any).query?.userPreferences?.findFirst).toHaveBeenCalled();
  });

  it('get returns existing preferences when found', async () => {
    const user = createMockUser(true);
    const pref = { user_id: user!.id, defaultWeightUnit: 'lbs' as const };

    const db = createMockDb({
      query: {
        userPreferences: {
          findFirst: vi.fn().mockResolvedValue(pref),
        },
      },
    });

    const trpc = buildCaller({ db, user });
    const res = await (trpc as any).preferences?.get?.();

    expect(res).toEqual(pref);
  });

  it('update inserts when none exists', async () => {
    const user = createMockUser(true);

    const findFirst = vi.fn().mockResolvedValue(null);
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnThis(),
    });

    const db = createMockDb({
      query: {
        userPreferences: {
          findFirst,
        },
      },
      insert,
      update: vi.fn(), // not used in this branch
    });

    const trpc = buildCaller({ db, user });
    const res = await (trpc as any).preferences?.update?.('lbs');

    expect(res).toEqual({ success: true });
    expect(findFirst).toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
  });

  it('update updates when existing preferences are present', async () => {
    const user = createMockUser(true);

    const findFirst = vi.fn().mockResolvedValue({ user_id: user!.id, defaultWeightUnit: 'kg' });
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    });

    const db = createMockDb({
      query: {
        userPreferences: {
          findFirst,
        },
      },
      update,
      insert: vi.fn(), // not used in this branch
    });

    const trpc = buildCaller({ db, user });
    const res = await (trpc as any).preferences?.update?.('lbs');

    expect(res).toEqual({ success: true });
    expect(findFirst).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('get requires auth', async () => {
    const db = createMockDb({
      query: { userPreferences: { findFirst: vi.fn() } },
    });

    await expect(async () => {
      const trpc = buildCaller({ db, user: null });
      return await (trpc as any).preferences?.get?.();
    }).rejects.toMatchObject({ name: 'TRPCError' });
  });
});
