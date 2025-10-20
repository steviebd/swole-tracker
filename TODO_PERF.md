# Database Performance Improvement Plan

This document outlines findings from a performance review of the application's database interactions and proposes a set of tasks to improve performance, reduce latency, and enhance scalability.

**Note on Cloudflare Free Tier**: All of the following recommendations are achievable within the Cloudflare free tier. Caching can be implemented using the Cloudflare Cache API, and all other suggestions involve code and schema changes that do not require paid features.

## Key Findings

1.  **Complex tRPC Queries**: The `progressRouter` contains several tRPC procedures with highly complex queries. Procedures like `getExerciseStrengthProgression` and `getTopExercises` involve multiple joins, subqueries, and `CASE` statements that can be slow and resource-intensive, especially as the `sessionExercises` table grows.

2.  **Potential N+1 Query in `getLinkedExerciseNames`**: The `getLinkedExerciseNames` utility function appears to introduce a potential N+1 query. It first fetches a `masterExercise` and then issues separate queries to find all `templateExercises` linked to it, leading to a cascade of database calls.

3.  **Client-Side Data Aggregation**: Several procedures fetch raw data from the database and perform aggregations and calculations in the application layer (e.g., `calculateLocalOneRM`, `calculateVolumeLoad`). This increases data transfer and puts unnecessary computational load on the application server.

4.  **Slow `COALESCE` Usage**: The `getTopExercises` and `getExerciseList` procedures use `COALESCE` to merge `masterExercises.name` and `sessionExercises.exerciseName`. On large tables, this operation can be a significant performance bottleneck.

5.  **Inefficient JSON Blob Storage**: Several tables, including `whoop_recovery`, `whoop_cycles`, and `whoop_sleep`, store important data in `raw_data` JSON blobs. Querying and filtering based on attributes within these blobs is inefficient and not scalable.

6.  **Lack of True Transactions**: The database layer uses a mock for transactions because Cloudflare D1 does not support them. While this is a known limitation of D1, it means that multi-statement operations are not atomic, which could lead to data inconsistency under load.

7.  **Suboptimal Indexing**: Although the schema is generally well-indexed, there are opportunities for further optimization. The `TODO_NEW.md` file correctly identifies the need for a composite index on `user_id + createdAt` in the `sessionDebriefs` table. A broader review of query patterns would likely reveal other missing indexes.

## Recommended Actions

### 1. Query Optimization

- [x] **Task**: Refactor complex queries in `progressRouter`.
  **Details**: Break down the queries in `getExerciseStrengthProgression` and `getTopExercises` into smaller, more manageable parts. Use `EXPLAIN QUERY PLAN` to analyze the query performance and identify bottlenecks.
  **Priority**: High
  **Status**: Completed – progression endpoints now query via `sessionExerciseMetricsView` with per-period fetches and reduced post-processing.

- [x] **Task**: Create database views to simplify complex queries.
  **Details**: Implement database views to encapsulate the logic for complex joins and calculations. This will simplify the application-level queries and ensure that the logic is centralized and optimized in the database.
  **Priority**: Medium
  **Status**: Completed – added `view_session_exercise_metrics` for reuse across progress analytics.

### 2. Eliminate N+1 Queries

- [x] **Task**: Rewrite `getLinkedExerciseNames` to use a single, efficient query.
  **Details**: Refactor the function to use a `JOIN` to fetch all linked `templateExercises` in a single database call, eliminating the N+1 pattern.
  **Priority**: High
  **Status**: Completed – helper now performs one scoped join and caches resolved names for inserts.

### 3. Optimize `COALESCE` Usage

- [x] **Task**: Denormalize `exerciseName` to avoid `COALESCE`.
  **Details**: To eliminate the slow `COALESCE` operation, consider denormalizing the `exerciseName` from `masterExercises` into the `sessionExercises` table. This can be managed with a periodic batch job, as D1 does not support triggers.
  **Priority**: Medium
  **Status**: Completed – `resolvedExerciseName` is persisted and referenced by all high-traffic queries.

### 4. Optimize JSON Blob Storage

- [x] **Task**: Extract critical fields from JSON blobs.
  **Details**: Identify the most frequently queried fields within the `raw_data` JSON blobs and extract them into separate, indexed columns. This will dramatically improve query performance on these tables.
  **Priority**: Medium
  **Status**: Completed – WHOOP recovery, cycle, and sleep ingestion now persists respiratory, strain, and sleep-need metrics as first-class columns.

### 5. Implement a Caching Strategy

- **Task**: Introduce a caching layer for expensive queries.
- **Details**: Implement a caching solution using the Cloudflare Cache API to cache the results of expensive and frequently executed queries, particularly in the `progressRouter`. This will significantly reduce database load and improve response times.
- **Priority**: High

### 6. Indexing Review

- [x] **Task**: Conduct a comprehensive review of database indexes.
  **Details**: Analyze the query patterns across the application to identify and add any missing indexes. Re-iterate the importance of adding the composite index on `user_id + createdAt` in the `sessionDebriefs` table as noted in `TODO_NEW.md`.
  **Priority**: Medium
  **Status**: Completed – verified `session_debrief_user_created_idx` exists and added `session_exercise_user_resolved_name_idx` to optimize resolved exercise lookups introduced by denormalization.
`