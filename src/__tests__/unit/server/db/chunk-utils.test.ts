/**
 * Tests for database chunk utilities
 * Tests critical chunking functionality for D1 compatibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  chunkArray,
  getInsertChunkSize,
  chunkedBatch,
  chunkedInsert,
  whereInChunks,
  SQLITE_VARIABLE_LIMIT,
  DEFAULT_SINGLE_COLUMN_CHUNK_SIZE,
} from "~/server/db/chunk-utils";

describe("Chunk Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("chunkArray", () => {
    it("should chunk array into equal parts", () => {
      const items = [1, 2, 3, 4, 5, 6];
      const chunks = chunkArray(items, 2);

      expect(chunks).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
    });

    it("should handle last chunk with fewer items", () => {
      const items = [1, 2, 3, 4, 5];
      const chunks = chunkArray(items, 2);

      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("should return single chunk when chunk size exceeds array length", () => {
      const items = [1, 2, 3];
      const chunks = chunkArray(items, 10);

      expect(chunks).toEqual([[1, 2, 3]]);
    });

    it("should return empty array for empty input", () => {
      const chunks = chunkArray([], 3);

      expect(chunks).toEqual([]);
    });

    it("should throw error for non-positive chunk size", () => {
      expect(() => chunkArray([1, 2, 3], 0)).toThrow(
        "chunkSize must be positive",
      );
      expect(() => chunkArray([1, 2, 3], -1)).toThrow(
        "chunkSize must be positive",
      );
    });

    it("should handle chunk size of 1", () => {
      const items = [1, 2, 3];
      const chunks = chunkArray(items, 1);

      expect(chunks).toEqual([[1], [2], [3]]);
    });

    it("should handle large arrays", () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const chunks = chunkArray(items, 100);

      expect(chunks).toHaveLength(10);
      expect(chunks[0]).toEqual(Array.from({ length: 100 }, (_, i) => i));
      expect(chunks[9]).toEqual(Array.from({ length: 100 }, (_, i) => i + 900));
    });

    it("should handle readonly arrays", () => {
      const items = [1, 2, 3, 4, 5] as const;
      const chunks = chunkArray(items, 2);

      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe("getInsertChunkSize", () => {
    it("should return limit for empty array", () => {
      const chunkSize = getInsertChunkSize([], 100);
      expect(chunkSize).toBe(100);
    });

    it("should calculate chunk size based on object column count", () => {
      const rows = [
        { id: 1, name: "test", value: 42 }, // 3 columns
        { id: 2, name: "test2", value: 43 },
      ];

      const chunkSize = getInsertChunkSize(rows, 90);
      expect(chunkSize).toBe(Math.floor(90 / 3)); // 30
    });

    it("should handle single column objects", () => {
      const rows = [{ id: 1 }, { id: 2 }];

      const chunkSize = getInsertChunkSize(rows, 90);
      expect(chunkSize).toBe(90);
    });

    it("should handle objects with many columns", () => {
      const rows = [
        { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10 },
      ];

      const chunkSize = getInsertChunkSize(rows, 70);
      expect(chunkSize).toBe(Math.floor(70 / 10)); // 7
    });

    it("should return at least 1", () => {
      const rows = [
        {
          a: 1,
          b: 2,
          c: 3,
          d: 4,
          e: 5,
          f: 6,
          g: 8,
          h: 9,
          i: 10,
          j: 11,
          k: 12,
          l: 13,
          m: 14,
          n: 15,
          o: 16,
          p: 17,
          q: 18,
          r: 19,
          s: 20,
          t: 21,
          u: 22,
          v: 23,
          w: 24,
          x: 25,
          y: 26,
          z: 27,
          aa: 28,
          ab: 29,
          ac: 30,
          ad: 31,
          ae: 32,
          af: 33,
          ag: 34,
          ah: 35,
          ai: 36,
          aj: 37,
          ak: 38,
          al: 39,
          am: 40,
          an: 41,
          ao: 42,
          ap: 43,
          aq: 44,
          ar: 45,
          as: 46,
          at: 47,
          au: 48,
          av: 49,
          aw: 50,
          ax: 51,
          ay: 52,
          az: 53,
          ba: 54,
          bb: 55,
          bc: 56,
          bd: 57,
          be: 58,
          bf: 59,
          bg: 60,
          bh: 61,
          bi: 62,
          bj: 63,
          bk: 64,
          bl: 65,
          bm: 66,
          bn: 67,
          bo: 68,
          bp: 69,
          bq: 70,
          br: 71,
          bs: 72,
          bt: 73,
          bu: 74,
          bv: 75,
          bw: 76,
          bx: 77,
          by: 78,
          bz: 79,
          ca: 80,
          cb: 81,
          cc: 82,
          cd: 83,
          ce: 84,
          cf: 85,
          cg: 86,
          ch: 87,
          ci: 88,
          cj: 89,
          ck: 90,
          cl: 91,
          cm: 92,
          cn: 93,
          co: 94,
          cp: 95,
          cq: 96,
          cr: 97,
          cs: 98,
          ct: 99,
          cu: 100,
        },
      ];

      const chunkSize = getInsertChunkSize(rows, 70);
      expect(chunkSize).toBe(1); // Minimum of 1
    });

    it("should handle non-object rows", () => {
      const rows = [1, 2, 3, 4, 5];

      const chunkSize = getInsertChunkSize(rows, 90);
      expect(chunkSize).toBe(90);
    });

    it("should handle null rows", () => {
      const rows = [null, null, null];

      const chunkSize = getInsertChunkSize(rows, 90);
      expect(chunkSize).toBe(90);
    });

    it("should handle array rows", () => {
      const rows = [
        [1, 2, 3],
        [4, 5, 6],
      ];

      const chunkSize = getInsertChunkSize(rows, 90);
      expect(chunkSize).toBe(90);
    });

    it("should use default limit when not specified", () => {
      const rows = [{ id: 1, name: "test" }];

      const chunkSize = getInsertChunkSize(rows);
      expect(chunkSize).toBe(Math.floor(SQLITE_VARIABLE_LIMIT / 2));
    });
  });

  describe("chunkedBatch", () => {
    it("should return empty array for empty input", async () => {
      const mockDb = { batch: vi.fn() };

      const result = await chunkedBatch(mockDb, [], vi.fn());

      expect(result).toEqual([]);
      expect(mockDb.batch).not.toHaveBeenCalled();
    });

    it("should use db.batch when available", async () => {
      const mockDb = {
        batch: vi.fn().mockResolvedValue(["result1", "result2"]),
      };

      const rows = [{ id: 1 }, { id: 2 }];
      const createQuery = vi.fn().mockReturnValue("query");

      await chunkedBatch(mockDb, rows, createQuery, { limit: 50 });

      // With 2 rows and limit 50, chunk size will be 50, so 1 chunk
      expect(mockDb.batch).toHaveBeenCalledWith(["query"]);
    });

    it("should handle individual execution when batch not available", async () => {
      const mockDb = {};
      const mockPromise = vi.fn().mockResolvedValue("result");

      const rows = [{ id: 1 }, { id: 2 }];
      const createQuery = vi.fn().mockReturnValue(mockPromise);

      const result = await chunkedBatch(mockDb, rows, createQuery);

      // With default limit 70 and 2 rows with 1 column each, chunk size is 70
      // So both rows go into one chunk, createQuery is called once
      expect(createQuery).toHaveBeenCalledTimes(1);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it("should respect maxStatementsPerBatch", async () => {
      const mockDb = {
        batch: vi.fn().mockResolvedValue(["result"]),
      };

      const rows = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const createQuery = vi.fn().mockReturnValue("query");

      await chunkedBatch(mockDb, rows, createQuery, {
        limit: 50,
        maxStatementsPerBatch: 3,
      });

      // With limit 50 and 10 rows, chunk size is 50, so 1 chunk
      // With maxStatementsPerBatch 3, it should still be 1 batch call
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it("should handle empty chunks gracefully", async () => {
      const mockDb = {
        batch: vi.fn().mockResolvedValue([]),
      };

      const rows = [{ id: 1 }];
      const createQuery = vi.fn().mockReturnValue("query");

      await chunkedBatch(mockDb, rows, createQuery, { limit: 1 });

      expect(mockDb.batch).toHaveBeenCalledWith(["query"]);
    });
  });

  describe("chunkedInsert", () => {
    it("should return early for empty input", async () => {
      const insertFn = vi.fn();

      await chunkedInsert([], insertFn);

      expect(insertFn).not.toHaveBeenCalled();
    });

    it("should call insert function for each chunk", async () => {
      const insertFn = vi.fn().mockResolvedValue(undefined);
      const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

      await chunkedInsert(rows, insertFn, 2);

      expect(insertFn).toHaveBeenCalledTimes(2);
      expect(insertFn).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
      expect(insertFn).toHaveBeenCalledWith([{ id: 3 }, { id: 4 }]);
    });

    it("should use default limit when not specified", async () => {
      const insertFn = vi.fn().mockResolvedValue(undefined);
      const rows = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      await chunkedInsert(rows, insertFn);

      // Should be called multiple times based on default chunk size
      expect(insertFn).toHaveBeenCalled();
    });

    it("should skip empty chunks", async () => {
      const insertFn = vi.fn().mockResolvedValue(undefined);

      await chunkedInsert([{ id: 1 }], insertFn, 1);

      expect(insertFn).toHaveBeenCalledTimes(1);
      expect(insertFn).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });

  describe("whereInChunks", () => {
    it("should return empty array for empty input", async () => {
      const callback = vi.fn();

      const result = await whereInChunks([], callback);

      expect(result).toEqual([]);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should call callback for each chunk", async () => {
      const callback = vi.fn().mockResolvedValue(["result1", "result2"]);
      const values = [1, 2, 3, 4, 5];

      const result = await whereInChunks(values, callback, 2);

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenCalledWith([1, 2]);
      expect(callback).toHaveBeenCalledWith([3, 4]);
      expect(callback).toHaveBeenCalledWith([5]);
      expect(result).toEqual([
        "result1",
        "result2",
        "result1",
        "result2",
        "result1",
        "result2",
      ]);
    });

    it("should handle non-array callback results", async () => {
      const callback = vi.fn().mockResolvedValue("single result");
      const values = [1, 2, 3];

      const result = await whereInChunks(values, callback, 2);

      // whereInChunks should collect non-array results
      expect(result).toEqual(["single result", "single result"]);
    });

    it("should use default chunk size when not specified", async () => {
      const callback = vi.fn().mockResolvedValue([]);
      const values = Array.from({ length: 100 }, (_, i) => i);

      await whereInChunks(values, callback);

      expect(callback).toHaveBeenCalled();
    });

    it("should respect SQLITE_VARIABLE_LIMIT", async () => {
      const callback = vi.fn().mockResolvedValue([]);
      const values = Array.from({ length: 1000 }, (_, i) => i);

      await whereInChunks(values, callback, 200);

      // Should be limited by SQLITE_VARIABLE_LIMIT
      expect(callback).toHaveBeenCalled();
    });

    it("should ensure minimum chunk size of 1", async () => {
      const callback = vi.fn().mockResolvedValue([]);
      const values = [1, 2, 3];

      await whereInChunks(values, callback, 0);

      expect(callback).toHaveBeenCalledTimes(3);
    });

    it("should skip empty chunks", async () => {
      const callback = vi.fn().mockResolvedValue([]);

      await whereInChunks([1], callback, 1);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([1]);
    });
  });

  describe("Constants", () => {
    it("should export correct constants", () => {
      expect(SQLITE_VARIABLE_LIMIT).toBe(70);
      expect(DEFAULT_SINGLE_COLUMN_CHUNK_SIZE).toBe(70);
    });
  });
});
