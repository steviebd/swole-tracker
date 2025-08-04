import "./setup.debug-errors";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";

const createCaller = (opts?: Parameters<typeof buildCaller>[0]) => buildCaller(opts as any) as any;

describe("tRPC templates router additional flows (integration, mocked ctx/db)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("getById returns template with exercises when owned; throws when not found or not owned", async () => {
    const user = createMockUser(true);

    // Case 1: found, owned
    {
      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi
              .fn()
              .mockResolvedValueOnce({
                id: 10,
                user_id: user!.id,
                name: "Push",
                exercises: [{ id: 1, exerciseName: "Bench Press", orderIndex: 0 }],
              }),
          },
        },
      });
      const trpc = createCaller({ db, user });
      const res = await trpc.templates.getById({ id: 10 });
      expect(res.id).toBe(10);
      expect(res.user_id).toBe(user!.id);
      expect(Array.isArray(res.exercises)).toBe(true);
    }

    // Case 2: found, NOT owned -> throws
    {
      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce({
              id: 11,
              user_id: "another_user",
              name: "Pull",
              exercises: [],
            }),
          },
        },
      });
      const trpc = createCaller({ db, user });
      await expect(trpc.templates.getById({ id: 11 })).rejects.toThrow(/Template not found/i);
    }

    // Case 3: not found -> throws
    {
      const db = createMockDb({
        query: {
          workoutTemplates: { findFirst: vi.fn().mockResolvedValueOnce(null) },
        },
      });
      const trpc = createCaller({ db, user });
      await expect(trpc.templates.getById({ id: 999 })).rejects.toThrow(/Template not found/i);
    }
  });

  it("create inserts template and inserts exercises then links masters (happy path)", async () => {
    const user = createMockUser(true);
    const insertedTemplate = { id: 42, user_id: user!.id, name: "Push", createdAt: new Date() };
    const insertedExercises = [
      { id: 101, user_id: user!.id, templateId: insertedTemplate.id, exerciseName: "Bench Press", orderIndex: 0, linkingRejected: false },
      { id: 102, user_id: user!.id, templateId: insertedTemplate.id, exerciseName: "Overhead Press", orderIndex: 1, linkingRejected: false },
    ];

    const db = createMockDb({
      insert: vi.fn().mockImplementation((_table: any) => {
        return {
          values: vi.fn().mockImplementation((vals: any) => {
            const isTemplateInsert = Array.isArray(vals)
              ? !!(vals[0] && typeof vals[0] === "object" && "name" in vals[0] && !("templateId" in vals[0]))
              : !!(vals && typeof vals === "object" && "name" in vals && !("templateId" in vals));
            return {
              returning: vi.fn().mockResolvedValue(isTemplateInsert ? [insertedTemplate] : insertedExercises),
            };
          }),
        };
      }),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) })),
      query: {
        workoutTemplates: {
          // post-create reads are not strictly necessary for create(), but keep available
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])), // ensure new master created path would be taken if exercised
          })),
        })),
      })),
    } as any;

    const trpc = createCaller({ db, user });
    const created = await trpc.templates.create({ name: "Push", exercises: ["Bench Press", "Overhead Press"] });

    expect(created).toBeTruthy();
    expect(created.id).toBe(42);
    // Verify we attempted to insert template + exercises
    expect((db.insert as any)).toHaveBeenCalled();
  });

  it("create throws when insert returns no template row", async () => {
    const user = createMockUser(true);
    const db = createMockDb({
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])), // no template returned
        })),
      })),
      query: { workoutTemplates: { findMany: vi.fn(), findFirst: vi.fn() } },
    } as any);

    const trpc = createCaller({ db, user });
    await expect(trpc.templates.create({ name: "Bad", exercises: [] })).rejects.toThrow(/Failed to create template/i);
  });

  it("update renames template, replaces exercises, and links masters; also guards ownership", async () => {
    const user = createMockUser(true);
    const existingTemplate = { id: 55, user_id: user!.id, name: "Old", createdAt: new Date() };

    const db = createMockDb({
      query: {
        workoutTemplates: {
          findFirst: vi.fn().mockResolvedValue(existingTemplate),
        },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => []),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              { id: 201, user_id: user!.id, templateId: existingTemplate.id, exerciseName: "Incline Bench", orderIndex: 0, linkingRejected: false },
              { id: 202, user_id: user!.id, templateId: existingTemplate.id, exerciseName: "Dips", orderIndex: 1, linkingRejected: false },
            ]),
          ),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])), // master not found -> create-and-link path is exercised inside helpers
          })),
        })),
      })),
    } as any;

    const trpc = createCaller({ db, user });
    const out = await trpc.templates.update({ id: 55, name: "New Name", exercises: ["Incline Bench", "Dips"] });
    expect(out).toEqual({ success: true });

    // Ownership guarded branch
    (db.query.workoutTemplates.findFirst as any).mockResolvedValueOnce({ id: 55, user_id: "another", name: "X" });
    await expect(trpc.templates.update({ id: 55, name: "Z", exercises: [] })).rejects.toThrow(/Template not found/i);
  });

  it("delete removes template when owned; throws when not owned/not found", async () => {
    const user = createMockUser(true);

    // happy path
    {
      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce({ id: 77, user_id: user!.id }),
          },
        },
        delete: vi.fn(() => ({ where: vi.fn(async () => []) })),
      } as any;

      const trpc = createCaller({ db, user });
      const res = await trpc.templates.delete({ id: 77 });
      expect(res).toEqual({ success: true });
    }

    // not owned
    {
      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce({ id: 77, user_id: "another" }),
          },
        },
      } as any;

      const trpc = createCaller({ db, user });
      await expect(trpc.templates.delete({ id: 77 })).rejects.toThrow(/Template not found/i);
    }

    // not found
    {
      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
          },
        },
      } as any;

      const trpc = createCaller({ db, user });
      await expect(trpc.templates.delete({ id: 404 })).rejects.toThrow(/Template not found/i);
    }
  });
});
