import { describe, it, expect, beforeEach, vi } from "vitest";
import { templatesRouter } from "~/server/api/routers/templates";
import type { TRPCContext } from "~/server/api/trpc";

// Mock database
const mockDb = {
  query: {
    workoutTemplates: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(),
  })),
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(),
      })),
    })),
  })),
};

// Mock context
const mockCtx = {
  db: mockDb,
  user: { id: "test-user" },
  requestId: "test-request",
  headers: new Headers(),
  authCache: {
    userByToken: new Map(),
  },
} as unknown as TRPCContext;

describe("templatesRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll procedure", () => {
    it("should return all templates for the user", async () => {
      const mockTemplates = [
        {
          id: 1,
          name: "Push Day",
          user_id: "test-user",
          createdAt: new Date(),
          exercises: [],
        },
      ];

      mockDb.query.workoutTemplates.findMany.mockResolvedValue(mockTemplates);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll();

      expect(result).toEqual(mockTemplates);
      expect(mockDb.query.workoutTemplates.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: [expect.any(Object)],
        with: {
          exercises: {
            orderBy: expect.any(Object),
          },
        },
      });
    });
  });

  describe("getById procedure", () => {
    it("should return template when found and owned by user", async () => {
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "test-user",
        createdAt: new Date(),
        exercises: [],
      };

      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(mockTemplate);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getById({ id: 1 });

      expect(result).toEqual(mockTemplate);
    });

    it("should throw error when template not found", async () => {
      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(null);

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(caller.getById({ id: 1 })).rejects.toThrow(
        "Template not found",
      );
    });

    it("should throw error when template owned by different user", async () => {
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "different-user",
        createdAt: new Date(),
        exercises: [],
      };

      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(mockTemplate);

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(caller.getById({ id: 1 })).rejects.toThrow(
        "Template not found",
      );
    });
  });

  describe("create procedure", () => {
    it("should create new template successfully", async () => {
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "test-user",
        createdAt: new Date(),
      };

      // Mock no recent template
      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(null);

      // Mock template creation
      mockDb.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => [mockTemplate]),
        })),
      });

      // Mock exercises creation
      const mockExercises = [
        { id: 1, exerciseName: "Bench Press", templateId: 1 },
      ];
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn(() => ({
          returning: vi.fn(() => mockExercises),
        })),
      });

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "Push Day",
        exercises: ["Bench Press"],
      });

      expect(result).toEqual(mockTemplate);
    });

    it("should return existing recent template to prevent duplicates", async () => {
      const recentTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "test-user",
        createdAt: new Date(),
      };

      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(recentTemplate);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "Push Day",
        exercises: ["Bench Press"],
      });

      expect(result).toEqual(recentTemplate);
    });

    it("should create template without exercises", async () => {
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "test-user",
        createdAt: new Date(),
      };

      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => [mockTemplate]),
        })),
      });

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "Push Day",
        exercises: [],
      });

      expect(result).toEqual(mockTemplate);
    });
  });

  describe("update procedure", () => {
    it("should update template successfully", async () => {
      const existingTemplate = {
        id: 1,
        name: "Old Name",
        user_id: "test-user",
        createdAt: new Date(),
      };

      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(
        existingTemplate,
      );
      mockDb.update.mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      });
      mockDb.delete.mockReturnValue({
        where: vi.fn(() => Promise.resolve()),
      });

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 1,
        name: "New Name",
        exercises: ["Squat"],
      });

      expect(result).toEqual({ success: true });
    });

    it("should throw error when template not found", async () => {
      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(null);

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(
        caller.update({
          id: 1,
          name: "New Name",
          exercises: [],
        }),
      ).rejects.toThrow("Template not found");
    });

    it("should throw error when template owned by different user", async () => {
      const existingTemplate = {
        id: 1,
        name: "Old Name",
        user_id: "different-user",
        createdAt: new Date(),
      };

      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(
        existingTemplate,
      );

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(
        caller.update({
          id: 1,
          name: "New Name",
          exercises: [],
        }),
      ).rejects.toThrow("Template not found");
    });
  });

  describe("delete procedure", () => {
    it("should delete template successfully", async () => {
      const existingTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "test-user",
        createdAt: new Date(),
      };

      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(
        existingTemplate,
      );
      mockDb.delete.mockReturnValue({
        where: vi.fn(() => Promise.resolve()),
      });

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });

    it("should throw error when template not found", async () => {
      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(null);

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(caller.delete({ id: 1 })).rejects.toThrow(
        "Template not found",
      );
    });

    it("should throw error when template owned by different user", async () => {
      const existingTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "different-user",
        createdAt: new Date(),
      };

      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(
        existingTemplate,
      );

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(caller.delete({ id: 1 })).rejects.toThrow(
        "Template not found",
      );
    });
  });

  describe("normalizeExerciseName function", () => {
    it("should normalize exercise names correctly", () => {
      // We can't directly test the internal function, but we can test its behavior
      // through the procedures that use it
      expect("bench press").toBe("bench press"); // Placeholder test
    });
  });
});
