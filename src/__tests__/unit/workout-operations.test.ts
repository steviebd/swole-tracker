import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

describe("workout-operations client and server wrappers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  function makeSupabaseClient() {
    // Chainable query builder that returns the final promise when awaited.
    // supabase-js query builder is thenable at each step, so we mimic that.
    let finalResult: any = { data: null, error: null };
    const chain: any = {
      select: vi.fn().mockImplementation((_s?: string) => chain),
      eq: vi.fn().mockImplementation((_c: string, _v: any) => chain),
      order: vi.fn().mockImplementation((_c: string, _o: any) => chain),
      insert: vi.fn().mockImplementation((_v: any) => chain),
      single: vi.fn().mockImplementation(() => chain),
      limit: vi.fn().mockImplementation((_n: number) => chain),
      // When awaited, resolve to the canned result
      then: (onFulfilled: any, _onRejected?: any) =>
        Promise.resolve(finalResult).then(onFulfilled),
      // Ensure await works by providing a catch as well
      catch: (onRejected: any) =>
        Promise.resolve(finalResult).catch(onRejected),
    };
    const from = vi.fn().mockImplementation((_table: string) => chain);
    return {
      from,
      chain,
      setResult: (r: any) => {
        finalResult = r;
      },
    };
  }

  it("WorkoutOperationsClient.getWorkoutTemplates queries by user and orders", async () => {
    const clientMock = makeSupabaseClient();
    clientMock.setResult({ data: [{ id: 1 }], error: null });

    // Important: mock before importing module under test, and reset the module registry so mock is honored
    vi.resetModules();
    // Ensure mocked client object shape matches how module under test stores it.
    // WorkoutOperationsClient stores the returned object directly as `this.client`,
    // then calls this.client.from(...). So we must return { from }.
    vi.doMock("~/lib/supabase-client", () => ({
      createClerkSupabaseClient: (_session: any) => {
        return { from: clientMock.from };
      },
    }));
    // Also ensure server factory is mocked for any accidental import paths in the module
    vi.doMock("~/lib/supabase-server", () => ({
      createServerSupabaseClient: async () => ({ from: clientMock.from }),
    }));

    const { WorkoutOperationsClient } = await import(
      "~/lib/workout-operations"
    );

    const inst = new WorkoutOperationsClient({ getToken: async () => "t" });
    const res = await inst.getWorkoutTemplates("user_1");

    expect(clientMock.from).toHaveBeenCalledWith(
      "swole-tracker_workout_template",
    );
    expect(clientMock.chain.eq).toHaveBeenCalledWith("user_id", "user_1");
    expect(clientMock.chain.order).toHaveBeenCalledWith("createdAt", {
      ascending: false,
    });
    expect(res).toEqual([{ id: 1 }]);
  });

  it("WorkoutOperationsClient.createWorkoutTemplate inserts and returns single", async () => {
    const clientMock = makeSupabaseClient();
    clientMock.setResult({ data: { id: 10, name: "x" }, error: null });

    vi.resetModules();
    vi.doMock("~/lib/supabase-client", () => ({
      createClerkSupabaseClient: (_session: any) => ({ from: clientMock.from }),
    }));
    vi.doMock("~/lib/supabase-server", () => ({
      createServerSupabaseClient: async () => ({ from: clientMock.from }),
    }));

    const { WorkoutOperationsClient } = await import(
      "~/lib/workout-operations"
    );
    const inst = new WorkoutOperationsClient(null);
    const created = await inst.createWorkoutTemplate("user_2", "Leg Day");

    expect(clientMock.from).toHaveBeenCalledWith(
      "swole-tracker_workout_template",
    );
    expect(clientMock.chain.insert).toHaveBeenCalledWith({
      name: "Leg Day",
      user_id: "user_2",
    });
    expect(clientMock.chain.single).toHaveBeenCalled();
    expect(created).toEqual({ id: 10, name: "x" });
  });

  it("WorkoutOperationsClient.getRecentWorkouts limits, orders, and returns fields", async () => {
    const clientMock = makeSupabaseClient();
    clientMock.setResult({
      data: [
        {
          id: 1,
          templateId: 2,
          workoutDate: "2024-01-01",
          createdAt: "2024-01-01",
        },
      ],
      error: null,
    });

    vi.resetModules();
    vi.doMock("~/lib/supabase-client", () => ({
      createClerkSupabaseClient: (_session: any) => ({ from: clientMock.from }),
    }));
    vi.doMock("~/lib/supabase-server", () => ({
      createServerSupabaseClient: async () => ({ from: clientMock.from }),
    }));

    const { WorkoutOperationsClient } = await import(
      "~/lib/workout-operations"
    );
    const inst = new WorkoutOperationsClient(null);
    const recent = await inst.getRecentWorkouts("user_3", 7);

    expect(clientMock.from).toHaveBeenCalledWith(
      "swole-tracker_workout_session",
    );
    expect(clientMock.chain.eq).toHaveBeenCalledWith("user_id", "user_3");
    expect(clientMock.chain.order).toHaveBeenCalledWith("workoutDate", {
      ascending: false,
    });
    expect(clientMock.chain.limit).toHaveBeenCalledWith(7);
    expect(recent.length).toBe(1);
  });

  it("WorkoutOperationsClient.getWorkoutSession queries by id and user", async () => {
    const clientMock = makeSupabaseClient();
    clientMock.setResult({
      data: { id: 55, user_id: "user_4" },
      error: null,
    });

    vi.resetModules();
    vi.doMock("~/lib/supabase-client", () => ({
      createClerkSupabaseClient: (_session: any) => ({ from: clientMock.from }),
    }));
    vi.doMock("~/lib/supabase-server", () => ({
      createServerSupabaseClient: async () => ({ from: clientMock.from }),
    }));

    const { WorkoutOperationsClient } = await import(
      "~/lib/workout-operations"
    );
    const inst = new WorkoutOperationsClient({ getToken: async () => null });
    const sess = await inst.getWorkoutSession("user_4", 55);

    expect(clientMock.from).toHaveBeenCalledWith(
      "swole-tracker_workout_session",
    );
    expect(clientMock.chain.eq).toHaveBeenCalledWith("id", 55);
    expect(clientMock.chain.single).toHaveBeenCalled();
    expect(sess).toEqual({ id: 55, user_id: "user_4" });
  });

  it("WorkoutOperationsClient.createWorkoutSession inserts and returns single", async () => {
    const clientMock = makeSupabaseClient();
    clientMock.setResult({
      data: { id: 77, user_id: "user_5" },
      error: null,
    });

    vi.resetModules();
    vi.doMock("~/lib/supabase-client", () => ({
      createClerkSupabaseClient: (_session: any) => ({ from: clientMock.from }),
    }));

    const { WorkoutOperationsClient } = await import(
      "~/lib/workout-operations"
    );
    const inst = new WorkoutOperationsClient(null);
    const out = await inst.createWorkoutSession("user_5", 2, "2025-01-01");

    expect(clientMock.from).toHaveBeenCalledWith(
      "swole-tracker_workout_session",
    );
    expect(clientMock.chain.insert).toHaveBeenCalledWith({
      user_id: "user_5",
      templateId: 2,
      workoutDate: "2025-01-01",
    });
    expect(clientMock.chain.single).toHaveBeenCalled();
    expect(out).toEqual({ id: 77, user_id: "user_5" });
  });

  it("WorkoutOperationsClient.getSessionExercises filters and orders", async () => {
    const clientMock = makeSupabaseClient();
    clientMock.setResult({
      data: [{ id: 1, exerciseName: "Bench" }],
      error: null,
    });

    vi.resetModules();
    vi.doMock("~/lib/supabase-client", () => ({
      createClerkSupabaseClient: (_session: any) => ({ from: clientMock.from }),
    }));

    const { WorkoutOperationsClient } = await import(
      "~/lib/workout-operations"
    );
    const inst = new WorkoutOperationsClient(null);
    const list = await inst.getSessionExercises("user_6", 99);

    expect(clientMock.from).toHaveBeenCalledWith(
      "swole-tracker_session_exercise",
    );
    expect(clientMock.chain.eq).toHaveBeenCalledWith("sessionId", 99);
    expect(clientMock.chain.order).toHaveBeenCalledWith("createdAt", {
      ascending: true,
    });
    expect(list).toEqual([{ id: 1, exerciseName: "Bench" }]);
  });

  it("WorkoutOperationsClient.addSessionExercise inserts partial and returns single", async () => {
    const clientMock = makeSupabaseClient();
    clientMock.setResult({
      data: { id: 9, exerciseName: "Row" },
      error: null,
    });

    vi.resetModules();
    vi.doMock("~/lib/supabase-client", () => ({
      createClerkSupabaseClient: (_session: any) => ({
        from: clientMock.from,
      }),
    }));
    vi.doMock("~/lib/supabase-server", () => ({
      createServerSupabaseClient: async () => ({ from: clientMock.from }),
    }));

    const { WorkoutOperationsClient } = await import(
      "~/lib/workout-operations"
    );
    const inst = new WorkoutOperationsClient(null);
    const ex = await inst.addSessionExercise("user_7", 1, {
      templateExerciseId: null,
      exerciseName: "Row",
      weight: "50",
      reps: 10,
      sets: 3,
      unit: "kg",
      updatedAt: null as any, // not required by type; ensure it spreads okay
    } as any);

    expect(clientMock.from).toHaveBeenCalledWith(
      "swole-tracker_session_exercise",
    );
    expect(clientMock.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_7",
        sessionId: 1,
        exerciseName: "Row",
      }),
    );
    expect(clientMock.chain.single).toHaveBeenCalled();
    expect(ex).toEqual({ id: 9, exerciseName: "Row" });
  });

  it("WorkoutOperationsServer.getRecentWorkouts uses server client factory", async () => {
    const clientMock = makeSupabaseClient();
    clientMock.setResult({
      data: [
        {
          id: 2,
          templateId: 1,
          workoutDate: "2024-01-01",
          createdAt: "2024-01-01",
        },
      ],
      error: null,
    });

    vi.resetModules();
    vi.doMock("~/lib/supabase-server", () => ({
      createServerSupabaseClient: async () => ({ from: clientMock.from }),
    }));

    const { WorkoutOperationsServer } = await import(
      "~/lib/workout-operations"
    );
    const serverOps = new WorkoutOperationsServer();
    const recent = await serverOps.getRecentWorkouts("user_8", 3);

    expect(clientMock.from).toHaveBeenCalledWith(
      "swole-tracker_workout_session",
    );
    expect(clientMock.chain.eq).toHaveBeenCalledWith("user_id", "user_8");
    expect(clientMock.chain.order).toHaveBeenCalledWith("workoutDate", {
      ascending: false,
    });
    expect(clientMock.chain.limit).toHaveBeenCalledWith(3);
    expect(recent.length).toBe(1);
  });

  it("useWorkoutOperations returns a client instance; getServerWorkoutOperations returns server instance", async () => {
    // Mock both factories to prevent real imports side effects
    vi.doMock("~/lib/supabase-client", () => ({
      createClerkSupabaseClient: (_session: any) => ({ from: vi.fn() }),
    }));
    vi.doMock("~/lib/supabase-server", () => ({
      createServerSupabaseClient: async () => ({ from: vi.fn() }),
    }));

    const {
      useWorkoutOperations,
      getServerWorkoutOperations,
      WorkoutOperationsClient,
      WorkoutOperationsServer,
    } = await import("~/lib/workout-operations");

    const client = useWorkoutOperations(null);
    expect(client).toBeInstanceOf(WorkoutOperationsClient);

    const server = getServerWorkoutOperations();
    expect(server).toBeInstanceOf(WorkoutOperationsServer);
  });
});
