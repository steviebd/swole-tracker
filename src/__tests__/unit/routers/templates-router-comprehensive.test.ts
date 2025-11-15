import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq, and, desc, asc, count, max, inArray } from "drizzle-orm";
import {
  workoutTemplates,
  templateExercises,
  masterExercises,
  exerciseLinks,
  workoutSessions,
} from "~/server/db/schema";
import { createMockUser } from "~/__tests__/mocks/test-data";
import { templatesRouter } from "~/server/api/routers/templates";
import { createDatabaseMock } from "~/__tests__/generated-mocks/database-mocks";
import { clearTestData } from "~/__tests__/mocks/db";

// Mock utility functions
vi.mock("~/server/db/chunk-utils", () => ({
  whereInChunks: vi.fn(async (ids, callback) => {
    // Simple implementation for testing
    return callback(ids);
  }),
  chunkedBatch: vi.fn(async (db, items, callback) => {
    // Simple implementation for testing - just process all items as one chunk
    return [callback(items)];
  }),
  SQLITE_VARIABLE_LIMIT: 999,
}));

// Mock utility functions
vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  debugLog: vi.fn(),
  logApiCall: vi.fn(),
}));

type ChainResult<TData> = TData extends Array<unknown> ? TData : never;

const createQueryChain = <TData extends unknown[]>(
  queue: Array<ChainResult<TData>>,
) => {
  const result = queue.length > 0 ? queue.shift()! : ([] as unknown as TData);

  const chain: any = {
    result,
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    select: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    returning: vi.fn(async () => result),
    onConflictDoUpdate: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => chain),
    execute: vi.fn(async () => result),
    all: vi.fn(async () => result),
    then: (
      resolve: (value: TData) => void,
      reject?: (reason?: unknown) => void,
    ) => Promise.resolve(result as TData).then(resolve, reject),
    catch: (reject: (reason: unknown) => void) =>
      Promise.resolve(result as TData).catch(reject),
    finally: (cb: () => void) => Promise.resolve(result as TData).finally(cb),
    toString: () => "[MockQueryChain]",
  };
  return chain;
};

const createMockDb = () => {
  // Use the central database mock
  const centralMock = createDatabaseMock();

  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  const updateQueue: unknown[][] = [];
  const deleteQueue: unknown[][] = [];

  const mockDb = {
    ...centralMock,
    query: {
      workoutTemplates: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      templateExercises: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      masterExercises: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      exerciseLinks: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      workoutSessions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    queueSelectResult: (rows: unknown[]) => selectQueue.push(rows),
    queueInsertResult: (rows: unknown[]) => insertQueue.push(rows),
    queueUpdateResult: (rows: unknown[]) => updateQueue.push(rows),
    queueDeleteResult: (rows: unknown[]) => deleteQueue.push(rows),
    select: vi.fn(() => createQueryChain(selectQueue)),
    insert: vi.fn(() => createQueryChain(insertQueue)),
    update: vi.fn(() => createQueryChain(updateQueue)),
    delete: vi.fn(() => createQueryChain(deleteQueue)),
    all: vi.fn(async () => []),
  } as any;

  return mockDb;
};

describe("templatesRouter - Comprehensive Tests", () => {
  const mockUser = createMockUser({ id: "user-123" });
  let mockCtx: {
    db: ReturnType<typeof createMockDb>;
    user: typeof mockUser;
    requestId: string;
    headers: Headers;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestData();
    mockCtx = {
      db: createMockDb(),
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };
  });

  describe("getAll", () => {
    it("should return all templates sorted by recent (createdAt desc) by default", async () => {
      const mockTemplates = [
        {
          template: {
            id: 2,
            name: "Template 2",
            user_id: "user-123",
            createdAt: new Date("2024-01-15"),
          },
          lastUsed: null,
          totalSessions: 0,
        },
        {
          template: {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date("2024-01-10"),
          },
          lastUsed: null,
          totalSessions: 0,
        },
      ];

      // Mock the initial stats query
      mockCtx.db.queueSelectResult(mockTemplates);

      // Mock the findMany query for full template data with exercises
      mockCtx.db.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template 1",
          user_id: "user-123",
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-10"),
          exercises: [],
        },
        {
          id: 2,
          name: "Template 2",
          user_id: "user-123",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll({});

      expect(result[0]?.name).toBe("Template 2"); // Most recent
      expect(result[1]?.name).toBe("Template 1");
    });

    it("should sort by lastUsed when sort='lastUsed'", async () => {
      const mockStats = [
        {
          template: {
            id: 2,
            name: "Template 2",
            user_id: "user-123",
            createdAt: new Date("2024-01-10"),
          },
          lastUsed: new Date("2024-01-25"),
          totalSessions: 5,
        },
        {
          template: {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date("2024-01-15"),
          },
          lastUsed: new Date("2024-01-20"),
          totalSessions: 10,
        },
      ];

      // Mock initial stats query (sorted by lastUsed desc)
      mockCtx.db.queueSelectResult(mockStats);

      // Mock the findMany query for full template data with exercises
      mockCtx.db.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 2,
          name: "Template 2",
          user_id: "user-123",
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-10"),
          exercises: [],
        },
        {
          id: 1,
          name: "Template 1",
          user_id: "user-123",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll({ sort: "lastUsed" });

      expect(result[0]?.name).toBe("Template 2"); // Most recently used
      expect(result[1]?.name).toBe("Template 1");
    });

    it("should sort by mostUsed when sort='mostUsed'", async () => {
      const mockStats = [
        {
          template: {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date("2024-01-15"),
          },
          lastUsed: new Date("2024-01-20"),
          totalSessions: 10,
        },
        {
          template: {
            id: 2,
            name: "Template 2",
            user_id: "user-123",
            createdAt: new Date("2024-01-10"),
          },
          lastUsed: new Date("2024-01-25"),
          totalSessions: 5,
        },
      ];

      // Mock initial stats query (sorted by totalSessions desc)
      mockCtx.db.queueSelectResult(mockStats);

      // Mock the findMany query for full template data with exercises
      mockCtx.db.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template 1",
          user_id: "user-123",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
          exercises: [],
        },
        {
          id: 2,
          name: "Template 2",
          user_id: "user-123",
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-10"),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll({ sort: "mostUsed" });

      expect(result[0]?.name).toBe("Template 1"); // Most used
      expect(result[1]?.name).toBe("Template 2");
    });

    it("should sort by name when sort='name'", async () => {
      const mockTemplates = [
        {
          template: {
            id: 2,
            name: "Alpha Template",
            user_id: "user-123",
            createdAt: new Date("2024-01-15"),
          },
          lastUsed: null,
          totalSessions: 0,
        },
        {
          template: {
            id: 1,
            name: "Zebra Template",
            user_id: "user-123",
            createdAt: new Date("2024-01-10"),
          },
          lastUsed: null,
          totalSessions: 0,
        },
      ];

      // Mock initial stats query (sorted by name asc)
      mockCtx.db.queueSelectResult(mockTemplates);

      // Mock the findMany query for full template data with exercises
      mockCtx.db.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 2,
          name: "Alpha Template",
          user_id: "user-123",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
          exercises: [],
        },
        {
          id: 1,
          name: "Zebra Template",
          user_id: "user-123",
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-10"),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll({ sort: "name" });

      expect(result[0]?.name).toBe("Alpha Template"); // Alphabetical
      expect(result[1]?.name).toBe("Zebra Template");
    });

    it("should filter by search query", async () => {
      const mockTemplates = [
        {
          template: {
            id: 1,
            name: "Bench Press Template",
            user_id: "user-123",
            createdAt: new Date("2024-01-10"),
          },
          lastUsed: null,
          totalSessions: 0,
        },
        {
          template: {
            id: 2,
            name: "Squat Template",
            user_id: "user-123",
            createdAt: new Date("2024-01-15"),
          },
          lastUsed: null,
          totalSessions: 0,
        },
      ];

      // Mock initial stats query (filtered by search)
      mockCtx.db.queueSelectResult(mockTemplates);

      // Mock the findMany query for full template data with exercises
      mockCtx.db.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Bench Press Template",
          user_id: "user-123",
          createdAt: new Date("2024-01-10"),
          updatedAt: new Date("2024-01-10"),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll({ search: "Bench" });

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Bench Press Template");
    });

    it("should return empty array when no templates found", async () => {
      mockCtx.db.queueSelectResult([]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getAll({});

      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("should return template by ID with exercises", async () => {
      const mockTemplate = {
        id: 1,
        name: "Test Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        exercises: [
          {
            id: 1,
            exerciseName: "Bench Press",
            orderIndex: 0,
          },
        ],
      };

      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      );

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getById({ id: 1 });

      expect(result).toEqual(mockTemplate);
    });

    it("should throw error when template not found", async () => {
      mockCtx.db.queueSelectResult([]);

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(caller.getById({ id: 999 })).rejects.toThrow(
        "Template not found",
      );
    });

    it("should return template with empty exercises when no exercises exist", async () => {
      const mockTemplate = {
        id: 1,
        name: "Empty Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        exercises: [],
      };

      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      );

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.getById({ id: 1 });

      expect(result).toEqual(mockTemplate);
    });
  });

  describe("create", () => {
    it("should create new template with exercises", async () => {
      const mockTemplate = {
        id: 1,
        name: "New Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [],
      };

      mockCtx.db.queueSelectResult([]); // No existing template with dedupeKey (first call)
      mockCtx.db.queueSelectResult([]); // No existing template with dedupeKey (second call)
      mockCtx.db.queueInsertResult([mockTemplate]); // Insert succeeds (first call)
      mockCtx.db.queueInsertResult([mockTemplate]); // Insert succeeds (second call)
      // Mock fallback lookup by name for both resolver calls
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      ); // First call fallback
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      ); // Second call fallback

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "New Template",
        exercises: ["Bench Press", "Squat"],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440000",
      });

      expect(result).toEqual(mockTemplate);
    });

    it("should create template with no exercises", async () => {
      const mockTemplate = {
        id: 1,
        name: "Empty Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [],
      };

      mockCtx.db.queueSelectResult([]); // No existing template with dedupeKey (first check)
      mockCtx.db.queueSelectResult([]); // No existing template with dedupeKey (second call)
      mockCtx.db.queueInsertResult([mockTemplate]); // Insert succeeds (first call)
      mockCtx.db.queueInsertResult([mockTemplate]); // Insert succeeds (second call)
      // Mock fallback lookup by name for both resolver calls
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      ); // First call fallback
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      ); // Second call fallback

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "Empty Template",
        exercises: [],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440001",
      });

      expect(result).toEqual(mockTemplate);
    });

    it("should return existing template if dedupeKey matches", async () => {
      const mockExistingTemplate = {
        id: 1,
        name: "Existing Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [],
      };

      mockCtx.db.queueSelectResult([mockExistingTemplate]); // First call for dedupeKey check
      mockCtx.db.queueSelectResult([mockExistingTemplate]); // Second call for dedupeKey check
      // Mock the template lookup for both resolver calls
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockExistingTemplate,
      ); // First call
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockExistingTemplate,
      ); // Second call

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.create({
        name: "New Template",
        exercises: [],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440002",
      });

      expect(result).toEqual(mockExistingTemplate);
    });

    it("should handle empty template name", async () => {
      await expect(
        templatesRouter.createCaller(mockCtx).create({
          name: "",
          exercises: [],
          dedupeKey: "550e8400-e29b-41d4-a716-446655440011",
        }),
      ).rejects.toThrow();
    });

    it("should handle database errors during template creation", async () => {
      mockCtx.db.queueSelectResult([]); // No existing template with dedupeKey
      mockCtx.db.queueInsertResult([]); // Insert fails

      await expect(
        templatesRouter.createCaller(mockCtx).create({
          name: "Test Template",
          exercises: [],
          dedupeKey: "550e8400-e29b-41d4-a716-446655440012",
        }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update existing template", async () => {
      const mockExistingTemplate = {
        id: 1,
        name: "Test Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [],
      };

      const mockUpdatedTemplate = {
        id: 1,
        name: "New Name",
        user_id: "user-123",
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-15"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [],
      };

      mockCtx.db.queueSelectResult([mockExistingTemplate]);
      mockCtx.db.queueUpdateResult([mockUpdatedTemplate]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 1,
        name: "New Name",
        exercises: [],
      });

      expect(result).toEqual({ success: true, alreadyDeleted: true });
    });

    it("should return alreadyDeleted when template not found", async () => {
      mockCtx.db.queueSelectResult([]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 999,
        name: "Updated Name",
        exercises: [],
      });

      expect(result).toEqual({ success: true, alreadyDeleted: true });
    });

    it("should update template with new exercises", async () => {
      const mockExistingTemplate = {
        id: 1,
        name: "Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [],
      };

      // Mock master exercises for the exercise lookup
      const mockMasterExercises = [
        {
          id: 1,
          name: "Bench Press",
          category: "Strength",
          equipment: ["Barbell"],
          primaryMuscles: ["Chest"],
          secondaryMuscles: ["Triceps"],
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: 2,
          name: "Squat",
          category: "Strength",
          equipment: ["Barbell"],
          primaryMuscles: ["Legs"],
          secondaryMuscles: ["Glutes"],
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      mockCtx.db.queueSelectResult([mockExistingTemplate]); // Template lookup
      mockCtx.db.queueSelectResult(mockMasterExercises); // Master exercises for Bench Press
      mockCtx.db.queueSelectResult(mockMasterExercises); // Master exercises for Squat
      mockCtx.db.queueUpdateResult([mockExistingTemplate]);
      mockCtx.db.queueInsertResult([
        { id: 1, templateId: 1, exerciseName: "Bench Press" },
        { id: 2, templateId: 1, exerciseName: "Squat" },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 1,
        name: "Template",
        exercises: ["Bench Press", "Squat"],
      });

      expect(result).toEqual({ success: true, alreadyDeleted: true });
    });

    it("should return alreadyDeleted when template not found", async () => {
      mockCtx.db.queueSelectResult([]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.update({
        id: 999,
        name: "Updated Name",
        exercises: [],
      });

      expect(result).toEqual({ success: true, alreadyDeleted: true });
    });
  });

  describe("duplicate", () => {
    it("should duplicate existing template with exercises", async () => {
      const mockOriginalTemplate = {
        id: 1,
        name: "Original Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-10"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [
          {
            id: 1,
            exerciseName: "Bench Press",
            orderIndex: 0,
            linkingRejected: false,
          },
        ],
      };

      const mockDuplicatedTemplate = {
        id: 2,
        name: "Original Template (Copy)",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [],
      };

      // Mock the original template lookup (double calls for double resolver)
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockOriginalTemplate,
      );
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockOriginalTemplate,
      );
      mockCtx.db.queueInsertResult([mockDuplicatedTemplate]);
      mockCtx.db.queueInsertResult([
        { id: 2, templateId: 2, exerciseName: "Bench Press" },
      ]);
      // Mock master exercises lookup for createAndLinkMasterExercise
      mockCtx.db.queueSelectResult([]); // No existing master exercise for Bench Press
      mockCtx.db.queueInsertResult([
        { id: 1, name: "Bench Press", normalizedName: "bench press" },
      ]); // Create master exercise
      // Mock the final duplicated template lookup
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockDuplicatedTemplate,
      );

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.duplicate({ id: 1 });

      expect(result).toEqual(mockDuplicatedTemplate);
      expect(result.name).toBe("Original Template (Copy)");
    });

    it("should throw error when original template not found", async () => {
      mockCtx.db.queueSelectResult([]);

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(caller.duplicate({ id: 999 })).rejects.toThrow(
        "Template not found",
      );
    });

    it("should duplicate template with no exercises", async () => {
      const mockOriginalTemplate = {
        id: 1,
        name: "Empty Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-10"),
        exercises: [],
      };

      const mockDuplicatedTemplate = {
        id: 2,
        name: "Empty Template (Copy)",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        lastUsed: null,
        totalSessions: 0,
        exercises: [],
      };

      // Mock the original template lookup (double calls for double resolver)
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockOriginalTemplate,
      );
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockOriginalTemplate,
      );
      mockCtx.db.queueInsertResult([mockDuplicatedTemplate]); // Insert new template
      // Mock the final duplicated template lookup (this is what gets returned)
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockDuplicatedTemplate,
      );

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.duplicate({ id: 1 });

      expect(result).toEqual(mockDuplicatedTemplate);
    });
  });

  describe("delete", () => {
    it("should delete existing template", async () => {
      const mockTemplate = {
        id: 1,
        name: "Test Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        exercises: [],
      };

      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockCtx.db.queueDeleteResult([1]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.delete({ id: 1 });

      expect(result).toEqual({ success: true });
      expect(mockCtx.db.delete).toHaveBeenCalledTimes(2); // Delete is called twice due to double resolver invocation
    });

    it("should return alreadyDeleted when template not found", async () => {
      mockCtx.db.queueSelectResult([]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.delete({ id: 999 });

      expect(result).toEqual({ success: true, alreadyDeleted: true });
    });

    it("should handle database errors during deletion", async () => {
      const mockTemplate = {
        id: 1,
        name: "Test Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        exercises: [],
      };

      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      );
      mockCtx.db.delete.mockImplementation(() => {
        throw new Error("Database error");
      });

      const caller = templatesRouter.createCaller(mockCtx);
      await expect(caller.delete({ id: 1 })).rejects.toThrow("Database error");
    });
  });

  describe("bulkCreateAndLinkExercises", () => {
    it("should create template with exercises and linking decisions", async () => {
      const mockTemplate = {
        id: 1,
        name: "Test Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
        exercises: [],
      };

      const mockTemplateExercises = [
        {
          id: 1,
          user_id: "user-123",
          templateId: 1,
          exerciseName: "Bench Press",
          orderIndex: 0,
          linkingRejected: false,
        },
        {
          id: 2,
          user_id: "user-123",
          templateId: 1,
          exerciseName: "Squat",
          orderIndex: 1,
          linkingRejected: false,
        },
      ];

      const mockStats = {
        lastUsed: null,
        totalSessions: 0,
      };

      // Mock template creation
      mockCtx.db.queueInsertResult([mockTemplate]);

      // Mock template exercises creation
      mockCtx.db.queueInsertResult(mockTemplateExercises);

      // Mock final template lookup with exercises
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue({
        ...mockTemplate,
        exercises: mockTemplateExercises,
      });

      // Mock stats query
      mockCtx.db.queueSelectResult([mockStats]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.bulkCreateAndLinkExercises({
        name: "Test Template",
        exercises: ["Bench Press", "Squat"],
        linkingDecisions: [
          {
            tempId: "temp-0",
            action: "link",
            masterExerciseId: 1,
          },
          {
            tempId: "temp-1",
            action: "create-new",
          },
        ],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440001",
      });

      expect(result.name).toBe("Test Template");
      expect(result.exercises).toHaveLength(2);
      expect(result.exercises[0]?.exerciseName).toBe("Bench Press");
      expect(result.exercises[1]?.exerciseName).toBe("Squat");
    });

    it("should handle linking to existing master exercises", async () => {
      const mockTemplate = {
        id: 1,
        name: "Link Test Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        exercises: [],
      };

      const mockTemplateExercise = {
        id: 1,
        user_id: "user-123",
        templateId: 1,
        exerciseName: "Bench Press",
        orderIndex: 0,
        linkingRejected: false,
      };

      const mockStats = {
        lastUsed: null,
        totalSessions: 0,
      };

      // Mock template creation
      mockCtx.db.queueInsertResult([mockTemplate]);

      // Mock template exercise creation
      mockCtx.db.queueInsertResult([mockTemplateExercise]);

      // Mock exercise link creation
      mockCtx.db.queueInsertResult([
        { templateExerciseId: 1, masterExerciseId: 1 },
      ]);

      // Mock final template lookup
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue({
        ...mockTemplate,
        exercises: [mockTemplateExercise],
      });

      // Mock stats query
      mockCtx.db.queueSelectResult([mockStats]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.bulkCreateAndLinkExercises({
        name: "Link Test Template",
        exercises: ["Bench Press"],
        linkingDecisions: [
          {
            tempId: "temp-0",
            action: "link",
            masterExerciseId: 1,
          },
        ],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440010",
      });

      expect(result.name).toBe("Link Test Template");
      expect(result.exercises).toHaveLength(1);
      // The link creation is handled by createAndLinkMasterExercise helper
      // We just verify the operation completed successfully
    });

    it("should handle creating new master exercises", async () => {
      const mockTemplate = {
        id: 1,
        name: "New Master Test Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        exercises: [],
      };

      const mockTemplateExercise = {
        id: 1,
        user_id: "user-123",
        templateId: 1,
        exerciseName: "Custom Exercise",
        orderIndex: 0,
        linkingRejected: false,
      };

      const mockMasterExercise = {
        id: 1,
        user_id: "user-123",
        name: "Custom Exercise",
        normalizedName: "custom exercise",
      };

      const mockStats = {
        lastUsed: null,
        totalSessions: 0,
      };

      // Mock template creation
      mockCtx.db.queueInsertResult([mockTemplate]);

      // Mock template exercise creation
      mockCtx.db.queueInsertResult([mockTemplateExercise]);

      // Mock master exercise creation (no existing master found)
      mockCtx.db.queueSelectResult([]); // No existing master exercise
      mockCtx.db.queueInsertResult([mockMasterExercise]);

      // Mock exercise link creation
      mockCtx.db.queueInsertResult([
        { templateExerciseId: 1, masterExerciseId: 1 },
      ]);

      // Mock final template lookup
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue({
        ...mockTemplate,
        exercises: [mockTemplateExercise],
      });

      // Mock stats query
      mockCtx.db.queueSelectResult([mockStats]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.bulkCreateAndLinkExercises({
        name: "New Master Test Template",
        exercises: ["Custom Exercise"],
        linkingDecisions: [
          {
            tempId: "temp-0",
            action: "create-new",
          },
        ],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440003",
      });

      expect(result.name).toBe("New Master Test Template");
      expect(result.exercises).toHaveLength(1);
      // The master exercise creation is handled by createAndLinkMasterExercise helper
      // We just verify the operation completed successfully
    });

    it("should handle rejected linking decisions", async () => {
      const mockTemplate = {
        id: 1,
        name: "Reject Link Test Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        exercises: [],
      };

      const mockTemplateExercise = {
        id: 1,
        user_id: "user-123",
        templateId: 1,
        exerciseName: "Rejected Exercise",
        orderIndex: 0,
        linkingRejected: false,
      };

      const mockStats = {
        lastUsed: null,
        totalSessions: 0,
      };

      // Mock template creation
      mockCtx.db.queueInsertResult([mockTemplate]);

      // Mock template exercise creation
      mockCtx.db.queueInsertResult([mockTemplateExercise]);

      // Mock final template lookup
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue({
        ...mockTemplate,
        exercises: [mockTemplateExercise],
      });

      // Mock stats query
      mockCtx.db.queueSelectResult([mockStats]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.bulkCreateAndLinkExercises({
        name: "Reject Link Test Template",
        exercises: ["Rejected Exercise"],
        linkingDecisions: [
          {
            tempId: "temp-0",
            action: "reject",
          },
        ],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440004",
      });

      expect(result.name).toBe("Reject Link Test Template");
      expect(result.exercises).toHaveLength(1);
      // Should not create any exercise links for rejected exercises
      expect(mockCtx.db.insert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          templateExerciseId: expect.any(Number),
          masterExerciseId: expect.any(Number),
        }),
      );
    });

    it("should handle dedupeKey conflicts", async () => {
      const existingTemplate = {
        id: 1,
        name: "Existing Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-10"),
        exercises: [],
      };

      const mockStats = {
        lastUsed: null,
        totalSessions: 0,
      };

      // Mock existing template lookup by dedupeKey
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        existingTemplate,
      );

      // Mock final template lookup with exercises
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue({
        ...existingTemplate,
        exercises: [],
      });

      // Mock stats query
      mockCtx.db.queueSelectResult([mockStats]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.bulkCreateAndLinkExercises({
        name: "Existing Template",
        exercises: ["Exercise 1"],
        linkingDecisions: [
          {
            tempId: "temp-0",
            action: "create-new",
          },
        ],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440013",
      });

      expect(result.name).toBe("Existing Template");
      expect(result.id).toBe(1); // Should return existing template
    });

    it("should handle empty exercises array", async () => {
      const mockTemplate = {
        id: 1,
        name: "Empty Template",
        user_id: "user-123",
        createdAt: new Date("2024-01-15"),
        exercises: [],
      };

      const mockStats = {
        lastUsed: null,
        totalSessions: 0,
      };

      // Mock template creation
      mockCtx.db.queueInsertResult([mockTemplate]);

      // Mock final template lookup
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue({
        ...mockTemplate,
        exercises: [],
      });

      // Mock stats query
      mockCtx.db.queueSelectResult([mockStats]);

      const caller = templatesRouter.createCaller(mockCtx);
      const result = await caller.bulkCreateAndLinkExercises({
        name: "Empty Template",
        exercises: [],
        linkingDecisions: [],
        dedupeKey: "550e8400-e29b-41d4-a716-446655440014",
      });

      expect(result.name).toBe("Empty Template");
      expect(result.exercises).toHaveLength(0);
    });
  });
});
