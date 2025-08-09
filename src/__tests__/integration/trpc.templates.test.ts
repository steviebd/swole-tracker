import "./setup.debug-errors";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCaller,
  createMockDb,
  createMockUser,
  createLoggedMockDb,
} from "./trpc-harness";

// Seed public env in case this file is evaluated directly first
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

describe("tRPC templates router (integration, mocked ctx/db)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("getAll returns empty array for new user", async () => {
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

  it.skip("create inserts template and links master exercises", async () => {
    const user = createMockUser(true);
    const insertedTemplate = {
      id: 42,
      user_id: user!.id,
      name: "Push",
      createdAt: new Date(),
    };

    const insertedExercises = [
      {
        id: 101,
        user_id: user!.id,
        templateId: insertedTemplate.id,
        exerciseName: "Bench Press",
        orderIndex: 0,
        linkingRejected: false,
      },
      {
        id: 102,
        user_id: user!.id,
        templateId: insertedTemplate.id,
        exerciseName: "Overhead Press",
        orderIndex: 1,
        linkingRejected: false,
      },
    ];

    // Use robust default mock; only override findFirst/select minimal pieces
    const db = createLoggedMockDb();

    // Return our created template with exercises when requested with relations
    (db.query.workoutTemplates.findFirst as any) = vi.fn(
      async ({ with: withRel }: any = {}) => {
        return {
          ...insertedTemplate,
          exercises: withRel?.exercises ? insertedExercises : undefined,
        };
      },
    );

    // Use default select() from createMockDb which already yields [] for master_exercises lookups
    // and supports .limit(1); no override needed here.

    const trpc = buildCaller({ db, user });
    const input = {
      name: "Push",
      exercises: ["Bench Press", "Overhead Press"],
    };

    const created = await (trpc as any).templates.create(input);
    expect(created).toBeTruthy();
    expect(created.id).toBe(42);
    expect(created.name).toBe("Push");
  });

  it("getAll requires auth", async () => {
    const db = createMockDb({
      query: { workoutTemplates: { findMany: vi.fn() } },
    });

    await expect(async () => {
      const trpc = buildCaller({ db, user: null });
      return await (trpc as any).templates?.getAll?.();
    }).rejects.toMatchObject({ name: "TRPCError" });
  });
});
