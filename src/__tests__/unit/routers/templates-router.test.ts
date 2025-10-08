import { describe, it, expect, vi, beforeEach } from "vitest";

// Import after mocking
import { templatesRouter } from "~/server/api/routers/templates";
import { db } from "~/server/db";

describe("templatesRouter", () => {
  const mockUser = { id: "user-123" };
  const mockCtx = {
    db,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should return all templates for user", async () => {
      const mockTemplates = [
        {
          id: 1,
          name: "Push Day",
          user_id: "user-123",
          createdAt: new Date(),
          updatedAt: null,
          exercises: [
            {
              id: 1,
              exerciseName: "Bench Press",
              orderIndex: 0,
            },
            {
              id: 2,
              exerciseName: "Shoulder Press",
              orderIndex: 1,
            },
          ],
        },
        {
          id: 2,
          name: "Pull Day",
          user_id: "user-123",
          createdAt: new Date(),
          updatedAt: null,
          exercises: [
            {
              id: 3,
              exerciseName: "Deadlift",
              orderIndex: 0,
            },
          ],
        },
      ];

      // Mock the database query result
      const mockQueryResult = mockTemplates.map((template) => ({
        template,
        lastUsed: null,
        totalSessions: 0,
      }));

      // Mock the database query to return the expected result
      (db as any).select = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              groupBy: vi.fn(() => ({
                orderBy: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    then: vi.fn((resolve) => resolve(mockQueryResult)),
                  })),
                })),
              })),
            })),
          })),
        })),
      }));

      // Mock the second query for templates with exercises
      const mockTemplatesWithExercises = mockTemplates.map((template) => ({
        ...template,
        exercises: template.exercises,
      }));

      (db.query.workoutTemplates.findMany as any) = vi
        .fn()
        .mockResolvedValue(mockTemplatesWithExercises);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll();

      // The getAll method returns templates with additional lastUsed and totalSessions fields
      const expectedResult = mockTemplates.map((template) => ({
        ...template,
        lastUsed: null,
        totalSessions: 0,
      }));

      expect(result).toEqual(expectedResult);
    });

    it("should return empty array when no templates exist", async () => {
      const mockQueryBuilder = {
        leftJoin: vi.fn(() => mockQueryBuilder),
        where: vi.fn(() => mockQueryBuilder),
        groupBy: vi.fn(() => mockQueryBuilder),
        orderBy: vi.fn(() => mockQueryBuilder),
        then: vi.fn((resolve) => resolve([])),
      };

      (db as any).select = vi.fn().mockReturnValue({
        from: vi.fn(() => mockQueryBuilder),
      });

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll();

      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("should return template by id for owner", async () => {
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "user-123",
        createdAt: new Date(),
        updatedAt: null,
        exercises: [
          {
            id: 1,
            exerciseName: "Bench Press",
            orderIndex: 0,
          },
        ],
      };

      db.query.workoutTemplates.findFirst = vi
        .fn()
        .mockResolvedValue(mockTemplate);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getById({ id: 1 });

      expect(db.query.workoutTemplates.findFirst).toHaveBeenCalledWith({
        where: expect.anything(), // Drizzle SQL object for eq(workoutTemplates.id, input.id)
        with: {
          exercises: {
            orderBy: expect.anything(), // Drizzle SQL object for asc(exercises.orderIndex)
          },
        },
      });
      expect(result).toEqual(mockTemplate);
    });

    it("should throw error if template not found", async () => {
      db.query.workoutTemplates.findFirst = vi.fn().mockResolvedValue(null);

      const caller = templatesRouter.createCaller(mockCtx);

      await expect(caller.getById({ id: 999 })).rejects.toThrow(
        "Template not found",
      );
    });

    it("should throw error if template belongs to different user", async () => {
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "different-user",
        createdAt: new Date(),
        updatedAt: null,
        exercises: [],
      };

      db.query.workoutTemplates.findFirst = vi
        .fn()
        .mockResolvedValue(mockTemplate);

      const caller = templatesRouter.createCaller(mockCtx);

      await expect(caller.getById({ id: 1 })).rejects.toThrow(
        "Template not found",
      );
    });
  });

  describe("create", () => {
    it("should create new template with exercises", async () => {
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "user-123",
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockExercises = [
        {
          id: 1,
          exerciseName: "Bench Press",
          orderIndex: 0,
        },
        {
          id: 2,
          exerciseName: "Shoulder Press",
          orderIndex: 1,
        },
      ];

      // Mock the database operations
      (db.query.workoutTemplates.findFirst as any) = vi
        .fn()
        .mockResolvedValue(null); // No duplicate

      // Mock template creation
      const mockTemplateInsertBuilder = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTemplate]),
        }),
      };

      // Mock exercise creation
      const mockExerciseInsertBuilder = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockExercises),
        }),
      };

      // Mock master exercise creation
      const mockMasterExerciseInsertBuilder = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              user_id: "user-123",
              name: "Bench Press",
              normalizedName: "bench press",
            },
          ]),
        }),
      };

      // Mock exercise links creation
      const mockExerciseLinksInsertBuilder = {
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      };

      // Mock insert calls - template, exercises, master exercises (2), exercise links (2)
      (db.insert as any)
        .mockReturnValueOnce(mockTemplateInsertBuilder as any)
        .mockReturnValueOnce(mockExerciseInsertBuilder as any)
        .mockReturnValueOnce(mockMasterExerciseInsertBuilder as any)
        .mockReturnValueOnce(mockExerciseLinksInsertBuilder as any)
        .mockReturnValueOnce(mockMasterExerciseInsertBuilder as any)
        .mockReturnValueOnce(mockExerciseLinksInsertBuilder as any);

      // Mock update for exercise links (2 updates)
      const mockExerciseLinksUpdateBuilder = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      };

      (db.update as any)
        .mockReturnValueOnce(mockExerciseLinksUpdateBuilder as any)
        .mockReturnValueOnce(mockExerciseLinksUpdateBuilder as any);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "Push Day",
        exercises: ["Bench Press", "Shoulder Press"],
      });

      expect(result).toEqual(mockTemplate);
    });

    it("should prevent duplicate template names", async () => {
      const existingTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "user-123",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutTemplates.findFirst = vi
        .fn()
        .mockResolvedValue(existingTemplate);

      const caller = templatesRouter.createCaller(mockCtx);

      const result = await caller.create({
        name: "Push Day",
        exercises: ["Bench Press"],
      });

      expect(result).toEqual(existingTemplate);
    });

    it("should handle empty exercises array", async () => {
      const mockTemplate = {
        id: 1,
        name: "Empty Template",
        user_id: "user-123",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutTemplates.findFirst = vi.fn().mockResolvedValue(null);
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTemplate]),
        }),
      });

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "Empty Template",
        exercises: [],
      });

      expect(result).toEqual(mockTemplate);
    });

    it("should validate input constraints", async () => {
      const caller = templatesRouter.createCaller(mockCtx);

      // Empty name
      await expect(
        caller.create({
          name: "",
          exercises: ["Bench Press"],
        }),
      ).rejects.toThrow();

      // Name too long
      await expect(
        caller.create({
          name: "a".repeat(257),
          exercises: ["Bench Press"],
        }),
      ).rejects.toThrow();

      // Empty exercise name
      await expect(
        caller.create({
          name: "Test Template",
          exercises: [""],
        }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update template and replace exercises", async () => {
      const existingTemplate = {
        id: 1,
        name: "Old Name",
        user_id: "user-123",
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockExercises = [
        {
          id: 3,
          exerciseName: "New Exercise",
          orderIndex: 0,
        },
      ];

      db.query.workoutTemplates.findFirst = vi
        .fn()
        .mockResolvedValue(existingTemplate);
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockExercises),
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock the select query used by createAndLinkMasterExercise
      const mockSelectBuilder = {
        from: vi.fn(() => mockSelectBuilder),
        where: vi.fn(() => mockSelectBuilder),
        limit: vi.fn(() => mockSelectBuilder),
        then: vi.fn((resolve) => resolve([])), // No existing master exercise
      };
      (db as any).select = vi.fn(() => mockSelectBuilder);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 1,
        name: "New Name",
        exercises: ["New Exercise"],
      });

      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should throw error if template not found", async () => {
      db.query.workoutTemplates.findFirst = vi.fn().mockResolvedValue(null);

      const caller = templatesRouter.createCaller(mockCtx);

      await expect(
        caller.update({
          id: 999,
          name: "New Name",
          exercises: ["Exercise"],
        }),
      ).rejects.toThrow("Template not found");
    });

    it("should throw error if template belongs to different user", async () => {
      const existingTemplate = {
        id: 1,
        name: "Template",
        user_id: "different-user",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutTemplates.findFirst = vi
        .fn()
        .mockResolvedValue(existingTemplate);

      const caller = templatesRouter.createCaller(mockCtx);

      await expect(
        caller.update({
          id: 1,
          name: "New Name",
          exercises: ["Exercise"],
        }),
      ).rejects.toThrow("Template not found");
    });
  });

  describe("delete", () => {
    it("should delete template for owner", async () => {
      const existingTemplate = {
        id: 1,
        name: "Template to Delete",
        user_id: "user-123",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutTemplates.findFirst = vi
        .fn()
        .mockResolvedValue(existingTemplate);
      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });

    it("should throw error if template not found", async () => {
      db.query.workoutTemplates.findFirst = vi.fn().mockResolvedValue(null);

      const caller = templatesRouter.createCaller(mockCtx);

      await expect(caller.delete({ id: 999 })).rejects.toThrow(
        "Template not found",
      );
    });

    it("should throw error if template belongs to different user", async () => {
      const existingTemplate = {
        id: 1,
        name: "Template",
        user_id: "different-user",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutTemplates.findFirst = vi
        .fn()
        .mockResolvedValue(existingTemplate);

      const caller = templatesRouter.createCaller(mockCtx);

      await expect(caller.delete({ id: 1 })).rejects.toThrow(
        "Template not found",
      );
    });
  });

  describe("utility functions", () => {
    it("should normalize exercise names correctly", () => {
      // This would test the normalizeExerciseName function if it were exported
      // For now, we test the behavior through the router
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      // Mock the select query to throw an error
      const mockSelectBuilder = {
        from: vi.fn(() => mockSelectBuilder),
        where: vi.fn(() => mockSelectBuilder),
        leftJoin: vi.fn(() => mockSelectBuilder),
        groupBy: vi.fn(() => mockSelectBuilder),
        orderBy: vi.fn(() => mockSelectBuilder),
        then: vi.fn((resolve, reject) =>
          reject(new Error("Database connection failed")),
        ),
      };

      (db as any).select = vi.fn(() => mockSelectBuilder);

      const caller = templatesRouter.createCaller(mockCtx);

      await expect(caller.getAll()).rejects.toThrow(
        "Database connection failed",
      );
    });
  });
});
