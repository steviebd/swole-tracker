const DEFAULT_SQLITE_VARIABLE_LIMIT = 70;
const DEFAULT_D1_BATCH_LIMIT = 50;
const SQLITE_VARIABLE_LIMIT = DEFAULT_SQLITE_VARIABLE_LIMIT;
const DEFAULT_SINGLE_COLUMN_CHUNK_SIZE = DEFAULT_SQLITE_VARIABLE_LIMIT;
function chunkArray(items, chunkSize) {
  if (chunkSize <= 0) {
    throw new Error(`chunkSize must be positive. Received ${chunkSize}.`);
  }
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
function getInsertChunkSize(rows, limit = SQLITE_VARIABLE_LIMIT) {
  if (rows.length === 0) return limit;
  const sample = rows[0];
  if (sample && typeof sample === "object" && !Array.isArray(sample) && sample !== null) {
    const columnCount = Object.keys(sample).length;
    return Math.max(1, Math.floor(limit / Math.max(columnCount, 1)));
  }
  return limit;
}
async function chunkedBatch(db, rows, createQuery, options = {}) {
  if (rows.length === 0) return [];
  const { limit = SQLITE_VARIABLE_LIMIT, maxStatementsPerBatch } = options;
  const chunkSize = getInsertChunkSize(rows, limit);
  const chunks = chunkArray(rows, chunkSize).filter((chunk) => chunk.length);
  if (chunks.length === 0) return [];
  const statements = chunks.map((chunk) => createQuery(chunk));
  if (statements.length === 0) return [];
  const statementsPerBatch = Math.max(
    1,
    maxStatementsPerBatch ?? DEFAULT_D1_BATCH_LIMIT
  );
  const results = [];
  if (typeof db.batch === "function") {
    const batchStatements = statements;
    for (const statementChunk of chunkArray(
      batchStatements,
      statementsPerBatch
    )) {
      if (statementChunk.length === 0) continue;
      const batchResult = await db.batch(
        statementChunk
      );
      results.push(...batchResult);
    }
  } else {
    for (const statement of statements) {
      const result = await statement;
      results.push(result);
    }
  }
  return results;
}
async function whereInChunks(values, callback, limit = DEFAULT_SINGLE_COLUMN_CHUNK_SIZE) {
  if (values.length === 0) return [];
  const chunkSize = Math.max(1, Math.min(limit, SQLITE_VARIABLE_LIMIT));
  const results = [];
  for (const chunk of chunkArray(values, chunkSize)) {
    if (chunk.length === 0) continue;
    const result = await callback(chunk);
    if (Array.isArray(result)) {
      results.push(...result);
    } else if (result !== void 0 && result !== null) {
      results.push(result);
    }
  }
  return results;
}
export {
  chunkedBatch as c,
  whereInChunks as w
};
