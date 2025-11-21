import type { BatchItem } from "drizzle-orm/batch";

// Reduced to 70 for safety margin (was 90)
// Reasoning: sessionExercises has ~15 columns
// - 70 / 15 = 4-5 rows per batch (safer)
// - 90 / 15 = 6 rows per batch (risky at D1 limit)
const DEFAULT_SQLITE_VARIABLE_LIMIT = 70;
const DEFAULT_D1_BATCH_LIMIT = 50;

export const SQLITE_VARIABLE_LIMIT = DEFAULT_SQLITE_VARIABLE_LIMIT;
export const DEFAULT_SINGLE_COLUMN_CHUNK_SIZE = DEFAULT_SQLITE_VARIABLE_LIMIT;

type BatchCapableDb = any;

export type ChunkedBatchOptions = {
  limit?: number;
  maxStatementsPerBatch?: number;
};

export function chunkArray<T>(items: readonly T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    throw new Error(`chunkSize must be positive. Received ${chunkSize}.`);
  }

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export function getInsertChunkSize<T>(
  rows: readonly T[],
  limit = SQLITE_VARIABLE_LIMIT,
): number {
  if (rows.length === 0) return limit;

  const sample = rows[0];
  if (
    sample &&
    typeof sample === "object" &&
    !Array.isArray(sample) &&
    sample !== null
  ) {
    const columnCount = Object.keys(sample as Record<string, unknown>).length;
    return Math.max(1, Math.floor(limit / Math.max(columnCount, 1)));
  }

  return limit;
}

export async function chunkedBatch<T>(
  db: BatchCapableDb,
  rows: readonly T[],
  createQuery: (chunk: T[]) => unknown,
  options: ChunkedBatchOptions = {},
): Promise<readonly unknown[]> {
  if (rows.length === 0) return [];

  const { limit = SQLITE_VARIABLE_LIMIT, maxStatementsPerBatch } = options;
  const chunkSize = getInsertChunkSize(rows, limit);
  const chunks = chunkArray(rows, chunkSize).filter((chunk) => chunk.length);
  if (chunks.length === 0) return [];

  const statements = chunks.map((chunk) => createQuery(chunk));
  if (statements.length === 0) return [];

  const statementsPerBatch = Math.max(
    1,
    maxStatementsPerBatch ?? DEFAULT_D1_BATCH_LIMIT,
  );

  const results: unknown[] = [];
  if (typeof db.batch === "function") {
    const batchStatements = statements as BatchItem<"sqlite">[];
    for (const statementChunk of chunkArray(
      batchStatements,
      statementsPerBatch,
    )) {
      if (statementChunk.length === 0) continue;
      const batchResult = await db.batch(
        statementChunk as unknown as readonly [
          BatchItem<"sqlite">,
          ...BatchItem<"sqlite">[],
        ],
      );
      results.push(...(batchResult as readonly unknown[]));
    }
  } else {
    // Execute individually, assuming statements are executable promises
    for (const statement of statements) {
      const result = await (statement as Promise<unknown>);
      results.push(result);
    }
  }

  return results;
}

/**
 * @deprecated Use {@link chunkedBatch} with Drizzle's `db.batch()` for atomic inserts.
 */
export async function chunkedInsert<T>(
  rows: readonly T[],
  insertFn: (chunk: T[]) => Promise<unknown>,
  limit = SQLITE_VARIABLE_LIMIT,
): Promise<void> {
  if (rows.length === 0) return;

  const chunkSize = getInsertChunkSize(rows, limit);
  for (const chunk of chunkArray(rows, chunkSize)) {
    if (chunk.length === 0) continue;
    await insertFn(chunk);
  }
}

export async function whereInChunks<T, R>(
  values: readonly T[],
  callback: (chunk: T[]) => Promise<R | R[] | void>,
  limit = DEFAULT_SINGLE_COLUMN_CHUNK_SIZE,
): Promise<R[]> {
  if (values.length === 0) return [];

  const chunkSize = Math.max(1, Math.min(limit, SQLITE_VARIABLE_LIMIT));
  const results: R[] = [];
  for (const chunk of chunkArray(values, chunkSize)) {
    if (chunk.length === 0) continue;
    const result = await callback(chunk);
    if (Array.isArray(result)) {
      results.push(...result);
    } else if (result !== undefined && result !== null) {
      results.push(result as R);
    }
  }
  return results;
}
