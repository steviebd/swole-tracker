import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller } from "./trpc-harness";

// This suite uses the mocked ctx/db from trpc-harness like other router tests.
// We cover: listing (getAll), create/update/delete, master linking, and auth checks.

// Helper to build a caller with strict typing for opts to avoid any
type CallerOpts = Parameters<typeof buildCaller>[0] | undefined;
const createCaller = (opts?: CallerOpts) => buildCaller(opts);

describe("tRPC exercises router (integration, mocked ctx/db)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchMaster returns empty items when query empty after normalize", async () => {
    // Provide a strict minimal DB that would throw if router accidentally touches it.
    // Router must early-return without any DB usage when q normalizes to empty.
    const db = {
      select: vi.fn(() => {
        throw new Error("DB should not be called for empty query");
      }),
    } as any;
    const caller = createCaller({ user: { id: "user_1" }, db });
    try {
      const result = await caller.exercises.searchMaster({ q: "   ", limit: 10, cursor: 0 });
      expect(result).toEqual({ items: [], nextCursor: null });
    } catch (e) {
      // Help surface the actual error causing "Unknown Error: undefined"
      // eslint-disable-next-line no-console
      console.error("[test-debug] searchMaster threw:", e);
      throw (e instanceof Error ? e : new Error(String(e)));
    }
  });

  it("createOrGetMaster creates when not found", async () => {
    // Create a minimal ad-hoc db that matches router usage exactly
    const userId = "user_1";
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            // router awaits `.limit(1)` directly, so make it resolve to []
            limit: vi.fn(async () => [] as Array<Record<string, unknown>>),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          // router awaits `.returning()` directly, make it resolve to a row
          returning: vi.fn(async () =>
            [
              { id: 1, user_id: userId, name: "Bench Press", normalizedName: "bench press", createdAt: new Date() },
            ] as Array<Record<string, unknown>>
          ),
        })),
      })),
    } as unknown;
    const caller = createCaller({ user: { id: userId }, db } as { user: { id: string }; db: unknown });

    const out = await caller.exercises.createOrGetMaster({ name: "Bench   Press" });
    expect(out).toMatchObject({ id: 1, name: "Bench Press", normalizedName: "bench press" });
  });

  it("linkToMaster verifies ownership and upserts link", async () => {
    const userId = "user_1";
    const select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce([{ id: 10, user_id: userId }]),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce([{ id: 99, user_id: userId }]),
          })),
        })),
      });

    const db = {
      select,
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([{ id: 5, templateExerciseId: 10, masterExerciseId: 99, user_id: userId }]),
            ),
          })),
        })),
      })),
    } as any;
    const caller = createCaller({ user: { id: userId }, db });

    const res = await caller.exercises.linkToMaster({ templateExerciseId: 10, masterExerciseId: 99 });
    expect(res).toMatchObject({ templateExerciseId: 10, masterExerciseId: 99 });
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("unlink removes link by templateExerciseId", async () => {
    const db = {
      delete: vi.fn(() => ({
        where: vi.fn(async () => [] as unknown[]),
      })),
    } as unknown;
    const caller = createCaller({ user: { id: "user_1" }, db } as { user: { id: string }; db: unknown });
    const out = await caller.exercises.unlink({ templateExerciseId: 10 });
    expect(out).toEqual({ success: true });
  });

  it("getAllMaster returns aggregated list", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn(() => ({
                orderBy: vi.fn(async () =>
                  [{ id: 1, name: "Bench", normalizedName: "bench", createdAt: new Date(), linkedCount: 0 }] as Array<Record<string, unknown>>,
                ),
              })),
            })),
          })),
        })),
      })),
    } as unknown;
    const caller = createCaller({ user: { id: "user_1" }, db } as { user: { id: string }; db: unknown });

    const rows = await caller.exercises.getAllMaster();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows[0]).toMatchObject({ id: 1, name: "Bench" });
  });

  it("searchMaster requires auth", async () => {
    const caller = createCaller({ user: null });
    await expect(caller.exercises.searchMaster({ q: "row", limit: 5, cursor: 0 }))
      .rejects.toMatchObject({ message: expect.stringMatching(/UNAUTHORIZED/i) });
  });

  it("createOrGetMaster requires auth", async () => {
    const caller = createCaller({ user: null });
    await expect(caller.exercises.createOrGetMaster({ name: "Deadlift" }))
      .rejects.toMatchObject({ message: expect.stringMatching(/UNAUTHORIZED/i) });
  });

  it("linkToMaster requires auth", async () => {
    const caller = createCaller({ user: null });
    await expect(caller.exercises.linkToMaster({ templateExerciseId: 1, masterExerciseId: 2 }))
      .rejects.toMatchObject({ message: expect.stringMatching(/UNAUTHORIZED/i) });
  });

  it("unlink requires auth", async () => {
    const caller = createCaller({ user: null });
    await expect(caller.exercises.unlink({ templateExerciseId: 1 }))
      .rejects.toMatchObject({ message: expect.stringMatching(/UNAUTHORIZED/i) });
  });

  it("getAllMaster requires auth", async () => {
    const caller = createCaller({ user: null });
    await expect(caller.exercises.getAllMaster())
      .rejects.toMatchObject({ message: expect.stringMatching(/UNAUTHORIZED/i) });
  });
});
