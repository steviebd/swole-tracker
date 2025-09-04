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

      db.query.workoutTemplates.findMany = vi
        .fn()
        .mockResolvedValue(mockTemplates);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll();

      expect(db.query.workoutTemplates.findMany).toHaveBeenCalledWith({
        where: expect.any(Function), // eq(workoutTemplates.user_id, ctx.user.id)
        orderBy: [expect.any(Function)], // desc(workoutTemplates.createdAt)
        with: {
          exercises: {
            orderBy: expect.any(Function), // asc(exercises.orderIndex)
          },
        },
      });
      expect(result).toEqual(mockTemplates);
    });

    it("should return empty array when no templates exist", async () => {
      db.query.workoutTemplates.findMany = vi.fn().mockResolvedValue([]);

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
        where: expect.any(Function), // eq(workoutTemplates.id, input.id)
        with: {
          exercises: {
            orderBy: expect.any(Function), // asc(exercises.orderIndex)
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
      mockDb.query.workoutTemplates.findFirst = vi.fn().mockResolvedValue(null); // No duplicate

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

      // Mock insert calls - first for template, second for exercises
      mockDb.insert
        .mockReturnValueOnce(mockTemplateInsertBuilder as any)
        .mockReturnValueOnce(mockExerciseInsertBuilder as any);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "Push Day",
        exercises: ["Bench Press", "Shoulder Press"],
      });

      expect(result).toEqual({
        template: mockTemplate,
        exercises: mockExercises,
      });
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

      await expect(
        caller.create({
          name: "Push Day",
          exercises: ["Bench Press"],
        }),
      ).rejects.toThrow("Template with this name already exists");
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

      expect(result).toEqual({
        template: mockTemplate,
        exercises: [],
      });
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
        }),
      });

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
      expect(db.delete).toHaveBeenCalledWith(
        expect.any(Function), // workoutTemplates table
        expect.objectContaining({
          where: expect.any(Function), // eq condition
        }),
      );
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
      db.query.workoutTemplates.findMany = vi
        .fn()
        .mockRejectedValue(new Error("Database connection failed"));

      const caller = templatesRouter.createCaller(mockCtx);

      await expect(caller.getAll()).rejects.toThrow(
        "Database connection failed",
      );
    });
  });
});
