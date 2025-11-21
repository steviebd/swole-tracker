import { vi } from "vitest";

// Enhanced mock database for router testing
type MockRow = Record<string, any>;
type MockResult<T = any> = { success: boolean; data: T; error?: string };

class MockDatabase {
  private data: Map<string, MockRow[]> = new Map();

  // Internal state for chain building
  private currentTable?: string;
  private currentCondition?: any;
  private currentInsertData?: any;
  private currentUpdateData?: any;

  constructor() {
    this.data.clear();
  }

  // Set up test data
  setTable(table: string, rows: MockRow[]) {
    this.data.set(table, rows);
  }

  getTable(table: string): MockRow[] {
    return this.data.get(table) || [];
  }

  // Drizzle-style chain methods
  select = vi.fn(() => this);
  from = vi.fn((table: string) => {
    this.currentTable = table;
    return this;
  });
  where = vi.fn((condition: any) => {
    this.currentCondition = condition;
    return this;
  });
  insert = vi.fn(() => this);
  values = vi.fn((data: any) => {
    this.currentInsertData = data;
    return this;
  });
  update = vi.fn(() => this);
  set = vi.fn((data: any) => {
    this.currentUpdateData = data;
    return this;
  });
  delete = vi.fn(() => this);

  // Additional chain methods needed by Drizzle
  innerJoin = vi.fn(() => this);
  leftJoin = vi.fn(() => this);
  groupBy = vi.fn(() => this);
  orderBy = vi.fn(() => this);
  limit = vi.fn(() => this);
  offset = vi.fn(() => this);
  onConflictDoUpdate = vi.fn(() => this);
  returning = vi.fn(() => this);

  // Execution methods
  execute = vi.fn(async () => {
    const table = this.currentTable;
    if (!table) return [];
    const rows = this.getTable(table);

    // Handle different operations based on what's been called
    if (this.currentInsertData) {
      const newRow = { id: rows.length + 1, ...this.currentInsertData };
      this.setTable(table, [...rows, newRow]);
      return [newRow];
    }

    if (this.currentUpdateData) {
      const condition = this.currentCondition;
      const updatedRows = rows.map((row) => {
        // Simple condition matching - in real tests this would be more sophisticated
        if (condition && condition.id && row["id"] === condition.id) {
          return { ...row, ...this.currentUpdateData };
        }
        return row;
      });
      this.setTable(table, updatedRows);
      return updatedRows;
    }

    if (this.currentCondition) {
      const condition = this.currentCondition;
      const filteredRows = rows.filter((row) => {
        // Simple condition matching
        if (condition.id && row["id"] === condition.id) return true;
        if (condition.sessionId && row["sessionId"] === condition.sessionId)
          return true;
        if (condition.user_id && row["user_id"] === condition.user_id)
          return true;
        return false;
      });
      return filteredRows;
    }

    return rows;
  });

  // Helper methods for testing
  all = vi.fn(async () => {
    const allData: Record<string, MockRow[]> = {};
    for (const [table, rows] of this.data.entries()) {
      allData[table] = rows;
    }
    return allData;
  });

  transaction = vi.fn(async (callback: (tx: any) => Promise<any>) => {
    return callback(this);
  });
}

// Create a singleton mock database instance
const mockDbInstance = new MockDatabase();

// Export the mock database with the same interface as the central mock
export const mockDb = {
  select: mockDbInstance.select,
  from: mockDbInstance.from,
  where: mockDbInstance.where,
  insert: mockDbInstance.insert,
  values: mockDbInstance.values,
  update: mockDbInstance.update,
  set: mockDbInstance.set,
  delete: mockDbInstance.delete,
  innerJoin: mockDbInstance.innerJoin,
  leftJoin: mockDbInstance.leftJoin,
  groupBy: mockDbInstance.groupBy,
  orderBy: mockDbInstance.orderBy,
  limit: mockDbInstance.limit,
  offset: mockDbInstance.offset,
  onConflictDoUpdate: mockDbInstance.onConflictDoUpdate,
  returning: mockDbInstance.returning,
  execute: mockDbInstance.execute,
  all: mockDbInstance.all,
  transaction: mockDbInstance.transaction,
};

// Mock database tables
export const mockTables = {
  users: {
    id: "id",
    email: "email",
    name: "name",
    createdAt: "created_at",
  },
  workouts: {
    id: "id",
    userId: "user_id",
    name: "name",
    createdAt: "created_at",
  },
  exercises: {
    id: "id",
    workoutId: "workout_id",
    name: "name",
    sets: "sets",
    reps: "reps",
    weight: "weight",
  },
};

// Mock database connection
export const createMockDb = () => mockDb;

// Helper to set up test data
export const setupTestData = (tableName: string, data: MockRow[]) => {
  mockDbInstance.setTable(tableName, data);
};

// Helper to clear all test data
export const clearTestData = () => {
  mockDbInstance.setTable("users", []);
  mockDbInstance.setTable("workouts", []);
  mockDbInstance.setTable("exercises", []);
  mockDbInstance.setTable("wellness_data", []);
  mockDbInstance.setTable("workout_sessions", []);
};
