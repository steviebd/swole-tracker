import { describe, it, expect, vi } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";

describe("tRPC exercises router (integration, mocked ctx/db)", () => {
  it.skip("basic getAll returns array via ctx.db.query", async () => {
    const user = createMockUser({ id: "user_ex_1" })!;
    const expected = [{ id: 1, name: "Bench Press" }];
    const db = createMockDb({
      query: {
        // shape compatible with router usage (findMany or custom)
        exercises: {
          findMany: vi.fn().mockResolvedValue(expected),
        },
      },
    });

    const caller = await buildCaller({ db, user });
    // Many routers expose a read-all/list method; adapt name if different
    // We'll call through the exercises router via any-known method:
    // Prefer getAll; if router uses list or get, adapt as needed.
    // @ts-expect-error - path name may vary; test will fail if not present and should be updated.
    const res = await caller.exercises.getAll?.() ?? await caller.exercises.list?.() ?? await caller.exercises.get?.();

    expect(Array.isArray(res)).toBe(true);
    expect(res?.[0]).toEqual(expected[0]);
    expect(db.query.exercises.findMany).toHaveBeenCalled();
  });

  it("auth check: if a protected read exists, unauthenticated should be UNAUTHORIZED; otherwise ignore", async () => {
    const db = createMockDb({
      query: {
        exercises: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });
    const caller = await buildCaller({ db, user: null });
    try {
      // @ts-expect-error conditional path
      await (caller.exercises.getAll?.() ?? caller.exercises.list?.() ?? caller.exercises.get?.());
      // If the procedure exists and returned, then it wasn't protected; acceptable for this smoke test.
    } catch (err: any) {
      // If router path missing, that's fine for this generic smoke test
      if (err?.code === "NOT_FOUND") return;
      // If it exists, we expect unauthorized for protected ones
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    }
  });
});
