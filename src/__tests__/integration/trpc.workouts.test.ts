import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCaller,
  createMockDb,
  createMockUser,
  createLoggedMockDb,
} from "./trpc-harness";

// Ensure required public env vars exist BEFORE importing modules that may load src/env.js
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

// We will mock db.workouts namespace methods that our procedures use.
// Adjust method names to the actual implementation if needed after first run.

describe("tRPC workouts router (integration, mocked ctx/db)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("workouts.getRecent returns empty array for a new user", async () => {
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

  it("workouts.start creates a session and returns template", async () => {
    const user = createMockUser(true);
    const template = {
      id: 1,
      user_id: user!.id,
      exercises: [],
    };

    // Build from default mock and override only template lookup; use default insert chains
    const db = createLoggedMockDb();

    // Ensure the template lookup returns our template with correct ownership
    (db.query.workoutTemplates.findFirst as any) = vi.fn(async () => ({
      ...template,
      name: "Mock Template",
      createdAt: new Date(),
      exercises: [],
    }));

    // Mock workoutSessions.findFirst to return null so a new session gets created
    (db.query.workoutSessions.findFirst as any) = vi.fn(async () => null);

    // Ensure the insert mock returns a proper session
    const mockReturning = vi.fn(async () => [
      {
        id: 500,
        user_id: user!.id,
        templateId: 1,
        workoutDate: new Date(),
      },
    ]);
    const mockValues = vi.fn(() => ({ returning: mockReturning }));
    (db.insert as any) = vi.fn(() => ({ values: mockValues }));

    const trpc = buildCaller({ db, user });
    const input = { templateId: 1, workoutDate: new Date() };
    const created = await (trpc as any).workouts?.start?.(input);

    // Verify that the function returns a valid response
    expect(created).toBeTruthy();
    expect(created.sessionId).toBe(500); // Based on the mock implementation
    expect(created.template).toBeTruthy();
    expect(created.template.name).toBe("Mock Template"); // Based on the mock implementation
  });

  it("workouts.getRecent requires auth for protected route", async () => {
    const db = createMockDb({
      query: { workoutSessions: { findMany: vi.fn() } },
    });

    // Build caller with no user and call getRecent; protectedProcedure should throw
    await expect(async () => {
      const trpc = buildCaller({ db, user: createMockUser(false) });
      // return the awaited promise so Vitest can catch the rejection
      return await (trpc as any).workouts?.getRecent?.({ limit: 5 });
    }).rejects.toMatchObject({ name: "TRPCError" });
  });
});
