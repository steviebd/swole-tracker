# Swole Tracker Refactoring TODO

This document contains detailed refactoring tasks prioritized by Performance and Code Quality. Each task includes specific file paths, line numbers, code examples, and acceptance criteria.

**Priority Order:**

1. Performance Optimizations
2. Code Quality Improvements

---

## PART 1: PERFORMANCE OPTIMIZATIONS

### P1: Fix N+1 Query Problem in Milestone Achievement Checking

**Priority:** 🔴 CRITICAL - High Database Load
**File:** `src/server/api/routers/workouts.ts`
**Lines:** 1360-1586
**Estimated Effort:** 3-4 hours

#### Current Problem

The milestone achievement logic runs inside a loop over master exercise IDs, generating 5+ database queries per exercise:

```typescript
// Lines 1360-1586
for (const masterExerciseId of masterExerciseIds) {
  // Query 1: Check plateaus
  const plateauResult = await detectPlateau(...);

  // Query 2: Get active milestones
  const activeMilestones = await ctx.db.select()
    .from(plateauMilestones)
    .where(and(
      eq(plateauMilestones.userId, ctx.user.id),
      eq(plateauMilestones.masterExerciseId, masterExerciseId),
      eq(plateauMilestones.status, "active")
    ));

  for (const milestone of activeMilestones) {
    // Query 3: Get current performance
    const currentPerformance = await ctx.db.select()...

    // Query 4: Volume/reps queries
    const volumeResult = await ctx.db.select()...

    // Query 5: Check existing achievements
    const recentAchievement = await ctx.db.select()...
  }
}
```

**Impact:** For a workout with 5 exercises, this generates 25+ database queries.

#### Refactoring Steps

1. **Extract milestone checking to a separate utility function**
   - Create new file: `src/server/api/utils/milestone-checking.ts`
   - Move the milestone logic from workouts.ts into this utility

2. **Batch fetch all milestones upfront**

   ```typescript
   // BEFORE: Query inside loop (N queries)
   for (const masterExerciseId of masterExerciseIds) {
     const activeMilestones = await ctx.db
       .select()
       .from(plateauMilestones)
       .where(eq(plateauMilestones.masterExerciseId, masterExerciseId));
   }

   // AFTER: Single batch query
   const allMilestones = await ctx.db
     .select()
     .from(plateauMilestones)
     .where(
       and(
         eq(plateauMilestones.userId, ctx.user.id),
         inArray(plateauMilestones.masterExerciseId, masterExerciseIds),
         eq(plateauMilestones.status, "active"),
       ),
     );

   // Group by masterExerciseId for easy lookup
   const milestonesByExercise = allMilestones.reduce(
     (acc, milestone) => {
       if (!acc[milestone.masterExerciseId]) {
         acc[milestone.masterExerciseId] = [];
       }
       acc[milestone.masterExerciseId].push(milestone);
       return acc;
     },
     {} as Record<number, typeof allMilestones>,
   );
   ```

3. **Batch fetch all performance data**

   ```typescript
   // Fetch all relevant exercise performances in one query
   const allPerformances = await ctx.db.select()
     .from(exercisePerformances)
     .where(and(
       eq(exercisePerformances.userId, ctx.user.id),
       inArray(exercisePerformances.masterExerciseId, masterExerciseIds)
     ))
     .orderBy(desc(exercisePerformances.recordedAt))
     .limit(100); // Reasonable limit for recent data

   // Group by masterExerciseId
   const performancesByExercise = allPerformances.reduce(...);
   ```

4. **Batch fetch existing achievements**

   ```typescript
   // Single query for all recent achievements
   const recentAchievements = await ctx.db.select()
     .from(plateauMilestoneAchievements)
     .where(and(
       eq(plateauMilestoneAchievements.userId, ctx.user.id),
       inArray(plateauMilestoneAchievements.milestoneId, allMilestones.map(m => m.id)),
       gte(plateauMilestoneAchievements.achievedAt, oneWeekAgo)
     ));

   // Group by milestoneId for lookup
   const achievementsByMilestone = recentAchievements.reduce(...);
   ```

5. **Process in memory instead of in database**

   ```typescript
   for (const masterExerciseId of masterExerciseIds) {
     // Use pre-fetched data
     const milestones = milestonesByExercise[masterExerciseId] || [];
     const performances = performancesByExercise[masterExerciseId] || [];

     for (const milestone of milestones) {
       const recentAchievement = achievementsByMilestone[milestone.id];
       if (recentAchievement) continue;

       // Check achievement using in-memory data
       const isAchieved = checkMilestoneAchievement(milestone, performances);
       if (isAchieved) {
         await createAchievement(milestone);
       }
     }
   }
   ```

#### Target Query Count

- **Before:** 5-25+ queries per workout save (depending on exercise count)
- **After:** 3-5 queries total (constant, regardless of exercise count)

#### Acceptance Criteria

- [x] All milestone data fetched in 1 query upfront
- [x] All performance data fetched in 1 query upfront
- [x] All recent achievements fetched in 1 query upfront
- [x] Total queries <= 5 regardless of number of exercises
- [x] All existing tests still pass
- [x] No behavioral changes to milestone logic

#### Files to Modify

1. `src/server/api/routers/workouts.ts` (lines 1360-1586)
2. Create `src/server/api/utils/milestone-checking.ts` (new file)

---

### P2: Optimize Plateau Detection Calls

**Priority:** 🟡 MEDIUM - Redundant Processing
**File:** `src/server/api/routers/workouts.ts`
**Lines:** 1263-1322, and within milestone checking
**Estimated Effort:** 2 hours

#### Current Problem

Plateau detection is called multiple times during workout save:

1. Fire-and-forget async operation (line 1263)
2. Inside milestone achievement loop (line 1360+)

This results in duplicate plateau calculations for the same exercises.

#### Refactoring Steps

1. **Call plateau detection once per exercise**

   ```typescript
   // BEFORE: Multiple calls in different places
   void (async () => {
     for (const masterExerciseId of masterExerciseIds) {
       await detectPlateau(...);
     }
   })();

   // Later...
   for (const masterExerciseId of masterExerciseIds) {
     const plateauResult = await detectPlateau(...); // Duplicate!
   }

   // AFTER: Single call, cache results
   const plateauResults = new Map<number, PlateauResult>();

   for (const masterExerciseId of masterExerciseIds) {
     const result = await detectPlateau({
       userId: ctx.user.id,
       masterExerciseId,
       db: ctx.db,
     });
     plateauResults.set(masterExerciseId, result);
   }

   // Use cached results in milestone checking
   ```

2. **Batch plateau detection if possible**
   - Check if `detectPlateau` utility can be refactored to accept multiple exercise IDs
   - If yes, fetch data for all exercises in fewer queries
   - File to examine: `src/server/api/utils/plateau-detection.ts`

#### Acceptance Criteria

- [ ] Plateau detection called only once per exercise per workout save
- [ ] Results cached and reused across milestone checking
- [ ] No duplicate database queries for same exercise data
- [ ] Existing plateau logic behavior unchanged

#### Files to Modify

1. `src/server/api/routers/workouts.ts` (lines 1263-1322, 1360-1586)
2. Potentially `src/server/api/utils/plateau-detection.ts` (for batching)

---

### P3: Extract and Optimize Workout Save Function

**Priority:** 🟡 MEDIUM - Code Complexity Impacts Performance
**File:** `src/server/api/routers/workouts.ts`
**Lines:** 984-1618
**Estimated Effort:** 4-6 hours

#### Current Problem

The `save` mutation is 617 lines long with multiple responsibilities:

- Set validation and normalization
- Exercise linking
- Set insertion (with chunking)
- Session calculation
- Debrief generation (fire-and-forget)
- Plateau detection (fire-and-forget)
- Milestone achievement checking
- Return value formatting

This makes it difficult to:

- Identify performance bottlenecks
- Optimize specific operations
- Test individual pieces
- Reason about query execution order

#### Refactoring Steps

1. **Create a service layer for workout operations**
   - New file: `src/server/api/services/workout-save-service.ts`

2. **Extract functions by responsibility**

   ```typescript
   // src/server/api/services/workout-save-service.ts

   export async function validateAndNormalizeSets(sets: SetInput[]) {
     // Lines 1002-1053 from workouts.ts
     // Validation logic
   }

   export async function ensureMasterExerciseLinks(
     db: Db,
     userId: string,
     sets: ProcessedSet[],
   ) {
     // Lines 1055-1082 from workouts.ts
     // Exercise linking logic
   }

   export async function insertWorkoutSets(
     db: Db,
     sessionId: number,
     sets: ProcessedSet[],
   ) {
     // Lines 1088-1140 from workouts.ts
     // Chunked batch insertion
   }

   export async function calculateSessionStats(
     db: Db,
     sessionId: number,
     sets: ProcessedSet[],
   ) {
     // Lines 1142-1161 from workouts.ts
     // Duration, volume, set count calculation
   }

   export async function triggerPostSaveAnalytics(
     ctx: Context,
     sessionId: number,
     masterExerciseIds: number[],
   ) {
     // Lines 1163-1322 from workouts.ts
     // Debrief generation, plateau detection
     // This is fire-and-forget, doesn't block response
   }

   export async function checkAndRecordMilestoneAchievements(
     ctx: Context,
     sessionId: number,
     masterExerciseIds: number[],
   ) {
     // Lines 1360-1586 from workouts.ts
     // AFTER P1 refactoring is complete
     // Optimized milestone checking
   }
   ```

3. **Simplify main save mutation**

   ```typescript
   // src/server/api/routers/workouts.ts
   save: protectedProcedure
     .input(saveWorkoutInputSchema)
     .mutation(async ({ ctx, input }) => {
       // Validate and normalize
       const processedSets = await validateAndNormalizeSets(input.sets);

       // Create or get session
       const session = await getOrCreateSession(ctx.db, input);

       // Ensure exercise links
       await ensureMasterExerciseLinks(ctx.db, ctx.user.id, processedSets);

       // Insert sets (chunked)
       await insertWorkoutSets(ctx.db, session.id, processedSets);

       // Calculate stats
       await calculateSessionStats(ctx.db, session.id, processedSets);

       // Get master exercise IDs
       const masterExerciseIds = [...new Set(processedSets.map(s => s.masterExerciseId))];

       // Trigger background analytics (non-blocking)
       void triggerPostSaveAnalytics(ctx, session.id, masterExerciseIds);

       // Check milestones (blocking - user wants to see achievements)
       await checkAndRecordMilestoneAchievements(ctx, session.id, masterExerciseIds);

       // Return saved data
       return formatWorkoutResponse(session);
     }),
   ```

4. **Benefit: Easier to optimize each piece independently**
   - Can add caching to `ensureMasterExerciseLinks`
   - Can parallelize independent operations
   - Can add performance monitoring per function
   - Can test each function in isolation

#### Acceptance Criteria

- [ ] Main `save` mutation is < 100 lines
- [ ] Each extracted function has a single responsibility
- [ ] All extracted functions properly typed
- [ ] Existing behavior unchanged (all tests pass)
- [ ] Each function independently testable
- [ ] Performance improved or unchanged

#### Files to Create/Modify

1. Create `src/server/api/services/workout-save-service.ts` (new file)
2. Modify `src/server/api/routers/workouts.ts` (lines 984-1618)

---

## PART 2: CODE QUALITY IMPROVEMENTS

### Q1: Remove Massive Code Duplication in exercises.ts

**Priority:** 🔴 CRITICAL - 500+ Lines of Duplicate Code
**File:** `src/server/api/routers/exercises.ts`
**Lines:** 800-1305
**Estimated Effort:** 1 hour

#### Current Problem

The `searchMaster` procedure contains 30+ identical blocks of test environment fallback code:

```typescript
// Line 940
if (process.env.NODE_ENV === "test" && results.length === 0) {
  results = [
    {
      id: 1,
      name: "Test Exercise",
      normalizedName: normalizeExerciseName(input.q),
      createdAt: new Date("2024-01-01T12:00:00Z"),
      source: "master",
      fuzzy_score: 100,
    },
  ];
}

// Line 950 - DUPLICATE
if (process.env.NODE_ENV === "test" && results.length === 0) {
  results = [
    /* identical code */
  ];
}

// Line 960 - "for safety" - DUPLICATE
if (process.env.NODE_ENV === "test" && results.length === 0) {
  results = [
    /* identical code */
  ];
}

// ... continues through "centuple for safety" at line 1305
```

This adds 500+ unnecessary lines.

#### Refactoring Steps

1. **Keep only ONE test fallback block**

   ```typescript
   // Delete lines 950-1305 (all duplicates)
   // Keep only the first block at line 940

   // searchMaster procedure (around line 800)
   .query(async ({ ctx, input }) => {
     let results: MasterExercise[] = [];

     try {
       // Actual search logic
       results = await ctx.db.select()
         .from(masterExercises)
         .where(/* search conditions */)
         .limit(20);
     } catch (error) {
       logger.error("searchMaster: query failed", { error, query: input.q });
       throw new TRPCError({
         code: "INTERNAL_SERVER_ERROR",
         message: "Failed to search exercises"
       });
     }

     // Single test fallback (only if genuinely needed for tests)
     if (process.env.NODE_ENV === "test" && results.length === 0) {
       results = [{
         id: 1,
         name: "Test Exercise",
         normalizedName: normalizeExerciseName(input.q),
         createdAt: new Date("2024-01-01T12:00:00Z"),
         source: "master" as const,
         fuzzy_score: 100,
       }];
     }

     return results;
   });
   ```

2. **Fix underlying test issue (if needed)**
   - Check test files that call `searchMaster`
   - If tests are failing without this fallback, mock the database properly
   - Use test fixtures or factories instead of production code fallbacks
   - Example:

     ```typescript
     // In test file
     import { mockDeep } from 'vitest-mock-extended';

     const mockDb = mockDeep<typeof db>();
     mockDb.select.mockReturnValue({
       from: vi.fn().mockReturnValue({
         where: vi.fn().mockResolvedValue([
           { id: 1, name: "Test Exercise", ... }
         ])
       })
     });
     ```

#### Acceptance Criteria

- [ ] Lines 950-1305 deleted from exercises.ts
- [ ] Only one test fallback remains (if needed at all)
- [ ] All tests still pass
- [ ] File size reduced by ~500 lines

#### Files to Modify

1. `src/server/api/routers/exercises.ts` (lines 800-1305)
2. Potentially test files that test `searchMaster`

---

### Q2: Replace `any` Types with Proper TypeScript Types

**Priority:** 🔴 HIGH - Type Safety
**Files:** Multiple routers (55 total occurrences)
**Estimated Effort:** 3-4 hours

#### Current Problem

55 instances of `any` type across the codebase, losing type safety benefits:

**Breakdown by file:**

- `exercises.ts`: 35 occurrences (many in duplicate code)
- `workouts.ts`: 7 occurrences
- `templates.ts`: 4 occurrences
- `insights.ts`: 4 occurrences
- Others: 5 occurrences

#### Examples and Fixes

**Example 1: Database type**

```typescript
// BEFORE (workouts.ts:77)
async function ensureMasterExerciseLinks(db: any, userId: string, sets: any[]) {
  // Function body
}

// AFTER
import { type Database } from "~/server/db";

async function ensureMasterExerciseLinks(
  db: Database,
  userId: string,
  sets: ProcessedSet[],
) {
  // Function body
}
```

**Example 2: Query results**

```typescript
// BEFORE (exercises.ts:595)
let results: any[] = [];

// AFTER
import { type MasterExercise } from "~/server/db/schema";

let results: MasterExercise[] = [];
```

**Example 3: Input data**

```typescript
// BEFORE
const processedSets = input.sets.map((set: any) => {
  return { ...set };
});

// AFTER
import { type SetInput } from "~/server/api/types";

const processedSets = input.sets.map((set: SetInput) => {
  return { ...set };
});
```

#### Refactoring Steps

1. **Create shared type definitions**
   - File: `src/server/api/types/index.ts`
   - Export commonly used types:

     ```typescript
     export type Database = typeof db;

     export type ProcessedSet = {
       exerciseId: number;
       masterExerciseId: number;
       reps: number | null;
       weight: number | null;
       rpe: number | null;
       restSeconds: number | null;
       notes: string | null;
       // ... all set fields
     };

     export type MasterExerciseLinkResult = {
       id: number;
       name: string;
       normalizedName: string;
       source: string;
     };
     ```

2. **Replace `any` in order of priority**
   - Start with `exercises.ts` (35 instances, many will be removed with Q1)
   - Then `workouts.ts` (7 instances)
   - Then `templates.ts` (4 instances)
   - Then `insights.ts` (4 instances)
   - Finally remaining files (5 instances)

3. **Common patterns to fix**

   ```typescript
   // Pattern 1: Function parameters
   // BEFORE: (data: any)
   // AFTER: (data: SpecificType)

   // Pattern 2: Array types
   // BEFORE: const items: any[] = []
   // AFTER: const items: ItemType[] = []

   // Pattern 3: Database queries
   // BEFORE: const result: any = await db.select()...
   // AFTER: const result = await db.select()...  (inferred)
   // OR:     const result: ResultType[] = await db.select()...

   // Pattern 4: Type assertions when necessary
   // If you genuinely don't know the type at compile time:
   // BEFORE: const data: any = JSON.parse(str)
   // AFTER: const data = JSON.parse(str) as unknown as ExpectedType
   // (Only use when truly necessary)
   ```

4. **Enable stricter TypeScript rules** (optional but recommended)
   ```typescript
   // tsconfig.json
   {
     "compilerOptions": {
       "noImplicitAny": true,  // Prevent implicit any
       "strictNullChecks": true,  // Prevent null/undefined issues
     }
   }
   ```

#### Acceptance Criteria

- [x] Created shared types file with common interfaces
- [x] Fixed `any` types in exercises.ts (ExerciseSearchResult interface)
- [x] Fixed `any` types in progress.ts (CacheEntry interface)
- [x] Fixed `any` types in insights.ts (SessionData interface)
- [x] Fixed `any` types in workouts.ts (complex type issues resolved)
- [x] All function parameters properly typed
- [x] All database query results properly typed
- [x] Shared types extracted to `src/server/api/types/index.ts`
- [x] No type errors in IDE
- [x] All existing functionality works

#### Files to Modify

1. `src/server/api/routers/exercises.ts` (35 instances)
2. `src/server/api/routers/workouts.ts` (7 instances)
3. `src/server/api/routers/templates.ts` (4 instances)
4. `src/server/api/routers/insights.ts` (4 instances)
5. Other files (5 instances total)
6. Create `src/server/api/types/index.ts` (new file)

---

### Q3: Replace console.log with Logger Utility

**Priority:** 🟡 MEDIUM - Production Logging
**Files:** 7 router files (45 total occurrences)
**Estimated Effort:** 1-2 hours

#### Current Problem

45 instances of `console.log`, `console.error`, `console.warn` in production code:

```typescript
// Examples from codebase:
console.log("getLastExerciseData: returning", {...});
console.error("Failed to fetch WHOOP integration status:", error);
console.log("searchMaster: query failed", error);
```

**Issues:**

- Production logs cluttered with debug statements
- No structured logging
- Potential sensitive data exposure
- Performance impact from string operations
- Can't filter/search logs effectively

#### Refactoring Steps

1. **Ensure logger is imported**

   ```typescript
   // Most files already have this import
   import { logger } from "~/server/logger";
   ```

2. **Replace all console.\* statements**

   ```typescript
   // BEFORE
   console.log("getLastExerciseData: returning", result);

   // AFTER
   logger.debug("getLastExerciseData: returning", { result });

   // BEFORE
   console.error("Failed to fetch WHOOP integration status:", error);

   // AFTER
   logger.error("whoop.integration_status_failed", {
     error: error instanceof Error ? error.message : String(error),
     stack: error instanceof Error ? error.stack : undefined,
   });

   // BEFORE
   console.warn("Session debrief generation failed", error);

   // AFTER
   logger.warn("session_debrief.generation_failed", {
     sessionId,
     error: error instanceof Error ? error.message : String(error),
   });
   ```

3. **Use appropriate log levels**
   - `logger.debug()`: Development debugging info (like previous console.log)
   - `logger.info()`: Important events (workout saved, milestone achieved)
   - `logger.warn()`: Non-critical issues (background job failed, fallback used)
   - `logger.error()`: Errors that need attention (query failed, invalid data)

4. **Structure log messages**

   ```typescript
   // Use dot notation for categorization
   logger.error("workout.save.validation_failed", { ... });
   logger.info("milestone.achieved", { ... });
   logger.warn("plateau.detection.no_data", { ... });

   // Include relevant context as structured data
   logger.error("exercise.search.query_failed", {
     userId: ctx.user.id,
     query: input.q,
     error: error.message,
     // Don't include sensitive data
   });
   ```

5. **Search and replace pattern**

   ```bash
   # Find all console statements
   grep -r "console\." src/server/api/routers/

   # Replace one by one (can't automate due to context differences)
   ```

#### Breakdown by File

- `workouts.ts`: ~15 instances
- `exercises.ts`: ~10 instances
- `whoop.ts`: ~8 instances
- `insights.ts`: ~5 instances
- `templates.ts`: ~3 instances
- `plateau-milestone.ts`: ~2 instances
- `playbook.ts`: ~2 instances

#### Acceptance Criteria

- [x] Zero `console.*` statements in `src/server/api/routers/`
- [x] All logging uses `logger.debug/info/warn/error`
- [x] Log messages use structured data (objects, not string concatenation)
- [x] Log levels appropriate for message severity
- [x] Error logs include error messages and context
- [x] No sensitive data in logs (passwords, tokens, etc.)

#### Files to Modify

1. `src/server/api/routers/workouts.ts` (~15 instances)
2. `src/server/api/routers/exercises.ts` (~10 instances)
3. `src/server/api/routers/whoop.ts` (~8 instances)
4. `src/server/api/routers/insights.ts` (~5 instances)
5. `src/server/api/routers/templates.ts` (~3 instances)
6. `src/server/api/routers/plateau-milestone.ts` (~2 instances)
7. `src/server/api/routers/playbook.ts` (~2 instances)

---

### Q4: Extract Shared Utility Functions

**Priority:** 🟡 MEDIUM - Code Duplication
**Files:** Multiple routers
**Estimated Effort:** 2 hours

#### Current Problem

Common utility functions are duplicated across multiple files:

**1. Exercise Name Normalization**

- Defined in `exercises.ts` (line 244)
- Defined in `templates.ts` (line 15)
- Defined in `workouts.ts` (line 68)

```typescript
// All three files have nearly identical code:
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");
}
```

**2. Master Exercise Creation Logic**

- Similar patterns in `exercises.ts` (line 147)
- Similar patterns in `templates.ts` (line 36)
- Similar patterns in `workouts.ts` (line 147)

#### Refactoring Steps

1. **Create shared utilities file**
   - File: `src/lib/exercise-utils.ts`

   ```typescript
   /**
    * Normalizes exercise name for matching and deduplication.
    * Converts to lowercase, trims whitespace, removes special characters.
    */
   export function normalizeExerciseName(name: string): string {
     return name
       .toLowerCase()
       .trim()
       .replace(/\s+/g, " ")
       .replace(/[^\w\s-]/g, "");
   }

   /**
    * Ensures a master exercise exists for the given name.
    * Creates one if it doesn't exist, returns existing if found.
    */
   export async function ensureMasterExercise(
     db: Database,
     exerciseName: string,
   ): Promise<{ id: number; name: string }> {
     const normalized = normalizeExerciseName(exerciseName);

     // Check if exists
     const existing = await db
       .select()
       .from(masterExercises)
       .where(eq(masterExercises.normalizedName, normalized))
       .limit(1);

     if (existing.length > 0) {
       return existing[0];
     }

     // Create new
     const [newExercise] = await db
       .insert(masterExercises)
       .values({
         name: exerciseName,
         normalizedName: normalized,
         source: "user",
       })
       .returning();

     return newExercise;
   }
   ```

2. **Replace all duplicates with imports**

   ```typescript
   // In exercises.ts, templates.ts, workouts.ts
   import {
     normalizeExerciseName,
     ensureMasterExercise,
   } from "~/lib/exercise-utils";

   // Remove local definitions
   // Delete lines with duplicate normalizeExerciseName function

   // Use imported version
   const normalized = normalizeExerciseName(input.name);
   ```

3. **Locations to update**
   - `src/server/api/routers/exercises.ts`:
     - Delete local `normalizeExerciseName` at line 244
     - Add import at top of file
     - Use imported function throughout

   - `src/server/api/routers/templates.ts`:
     - Delete local `normalizeExerciseName` at line 15
     - Add import at top of file
     - Replace local master exercise creation with `ensureMasterExercise`

   - `src/server/api/routers/workouts.ts`:
     - Delete local `normalizeExerciseName` at line 68
     - Add import at top of file
     - Replace local master exercise logic with `ensureMasterExercise`

4. **Add tests for shared utilities**
   - Create `src/__tests__/lib/exercise-utils.test.ts`

   ```typescript
   import { describe, it, expect } from "vitest";
   import { normalizeExerciseName } from "~/lib/exercise-utils";

   describe("normalizeExerciseName", () => {
     it("converts to lowercase", () => {
       expect(normalizeExerciseName("BENCH PRESS")).toBe("bench press");
     });

     it("trims whitespace", () => {
       expect(normalizeExerciseName("  squat  ")).toBe("squat");
     });

     it("removes special characters", () => {
       expect(normalizeExerciseName("pull-up!")).toBe("pull-up");
     });

     it("normalizes multiple spaces", () => {
       expect(normalizeExerciseName("barbell  row")).toBe("barbell row");
     });
   });
   ```

#### Acceptance Criteria

- [x] Single source of truth for `normalizeExerciseName`
- [x] Single source of truth for master exercise creation
- [x] All three routers use imported utilities
- [x] No duplicate function definitions
- [x] Utility functions have unit tests
- [x] All existing functionality unchanged

#### Files to Create/Modify

1. Create `src/lib/exercise-utils.ts` (new file)
2. Modify `src/server/api/routers/exercises.ts` (remove line 244, add import)
3. Modify `src/server/api/routers/templates.ts` (remove line 15, add import)
4. Modify `src/server/api/routers/workouts.ts` (remove line 68, add import)
5. Create `src/__tests__/lib/exercise-utils.test.ts` (new file)

---

### Q5: Clean Up Backup and Unused Files

**Priority:** 🟢 LOW - Housekeeping
**Files:** 11 total files (~1,300+ lines of dead code)
**Estimated Effort:** 20 minutes

#### Current Problem

Multiple backup files and an incomplete refactoring attempt exist in the codebase:

**Backup Files (4 files):**

- `src/app/_components/exercise-manager-backup.tsx` (985 lines)
- `src/app/_components/workout-history-backup.tsx`
- `src/app/_components/templates-list-backup.tsx`
- `src/app/_components/template-form-rhf-backup.tsx`

**Orphaned Refactor Attempt (7 files):**

- `src/app/_components/exercise-manager-refactored.tsx` (323 lines) - NOT imported anywhere
- `src/components/exercise-manager/exercise-table.tsx` - Only used by refactored version
- `src/components/exercise-manager/exercise-toolbar.tsx` - Only used by refactored version
- `src/components/exercise-manager/create-edit-exercise-dialog.tsx` - Only used by refactored version
- `src/components/exercise-manager/merge-exercise-dialog.tsx` - Only used by refactored version
- `src/components/exercise-manager/exercise-details.tsx` - Only used by refactored version

**Active Implementation:**

- `src/app/_components/exercise-manager.tsx` - **This is the actual active file** (imported by `src/app/exercises/page.tsx`)

The refactored version was never completed, leaving modular components and the refactored parent file as dead code.

#### Cleanup Steps

1. **Verify no imports reference these files**

   ```bash
   # Check for any imports
   grep -r "exercise-manager-refactored" src/
   grep -r "exercise-manager-backup" src/
   grep -r "components/exercise-manager" src/
   grep -r "workout-history-backup" src/
   grep -r "templates-list-backup" src/
   grep -r "template-form-rhf-backup" src/
   ```

2. **Delete backup files**

   ```bash
   rm src/app/_components/exercise-manager-backup.tsx
   rm src/app/_components/workout-history-backup.tsx
   rm src/app/_components/templates-list-backup.tsx
   rm src/app/_components/template-form-rhf-backup.tsx
   ```

3. **Delete orphaned refactor files**

   ```bash
   rm src/app/_components/exercise-manager-refactored.tsx
   rm -rf src/components/exercise-manager/
   ```

4. **Run build to verify**

   ```bash
   bun run build
   ```

5. **Alternative: Archive instead of delete** (if you want to preserve for reference)

   ```bash
   mkdir -p archive/components
   mkdir -p archive/components/exercise-manager

   # Move backups
   mv src/app/_components/*-backup.tsx archive/components/

   # Move orphaned refactor
   mv src/app/_components/exercise-manager-refactored.tsx archive/components/
   mv src/components/exercise-manager/* archive/components/exercise-manager/
   rmdir src/components/exercise-manager
   ```

#### Impact

- **Lines removed**: ~1,300+ lines of dead code
- **Files removed**: 11 files
- **Confusion eliminated**: Clear which exercise-manager implementation is active
- **Build size**: Slightly reduced (unused code removed from tree-shaking scope)

#### Acceptance Criteria

- [x] No `*-backup.tsx` files in `src/app/_components/`
- [x] No `exercise-manager-refactored.tsx` file
- [x] No `src/components/exercise-manager/` directory
- [x] Only `exercise-manager.tsx` remains as the active implementation
- [x] Build succeeds without errors: `bun run build`
- [x] Type check passes: `bun check`
- [x] No imports referencing deleted files
- [x] Exercise manager page still works: `src/app/exercises/page.tsx`

---

## PART 3: FEATURE ENHANCEMENTS

### F1: Fetch Actual Session Data for Plateau Analysis

**Priority:** 🟡 MEDIUM - Data Completeness
**File:** `src/server/api/routers/plateau-milestone.ts`
**Line:** 1091
**Estimated Effort:** 2-3 hours

#### Current Problem

When generating plateau recommendations, the system passes an empty array for `sessions` instead of fetching actual workout session data:

```typescript
// Line 1091
const recommendations = generatePlateauRecommendations({
  userId,
  masterExerciseId: p.masterExerciseId,
  sessions: [], // TODO: Fetch actual session data for this plateau
  maintenanceMode: false,
  experienceLevel: userPrefs.experienceLevel,
});
```

This limits the quality of recommendations since they don't have access to historical session data like volume, intensity, RPE, etc.

#### Implementation Steps

1. **Fetch session data for the plateau period**

   ```typescript
   // Query workout sessions within the plateau timeframe
   const plateauSessions = await ctx.db
     .select({
       weight: exerciseSets.weight,
       reps: exerciseSets.reps,
       rpe: exerciseSets.rpe,
       workoutDate: workoutSessions.workoutDate,
       sessionId: workoutSessions.id,
     })
     .from(exerciseSets)
     .innerJoin(
       workoutSessions,
       eq(exerciseSets.workoutSessionId, workoutSessions.id),
     )
     .where(
       and(
         eq(workoutSessions.userId, userId),
         eq(exerciseSets.masterExerciseId, p.masterExerciseId),
         gte(workoutSessions.workoutDate, p.startedAt),
         lte(workoutSessions.workoutDate, new Date()),
       ),
     )
     .orderBy(desc(workoutSessions.workoutDate));
   ```

2. **Transform to expected format**

   ```typescript
   // Transform to match expected session format
   const formattedSessions = plateauSessions.map((s) => ({
     weight: Number(s.weight) || 0,
     reps: Number(s.reps) || 0,
     rpe: Number(s.rpe) || null,
     date: s.workoutDate,
     sessionId: s.sessionId,
   }));
   ```

3. **Pass to recommendations function**

   ```typescript
   const recommendations = generatePlateauRecommendations({
     userId,
     masterExerciseId: p.masterExerciseId,
     sessions: formattedSessions, // Now includes actual data
     maintenanceMode: false,
     experienceLevel: userPrefs.experienceLevel,
   });
   ```

4. **Consider batching for performance**
   - If processing multiple plateaus, fetch all session data upfront
   - Group sessions by masterExerciseId for efficient lookup
   - Similar pattern to P1 (N+1 query optimization)

#### Acceptance Criteria

- [ ] Session data fetched for each plateau's timeframe
- [ ] Data includes weight, reps, RPE, and dates
- [ ] Sessions ordered chronologically
- [ ] Batched queries if processing multiple plateaus
- [ ] Recommendations quality improves with real data
- [ ] No performance regression

#### Files to Modify

1. `src/server/api/routers/plateau-milestone.ts` (line 1091)
2. Verify format matches `generatePlateauRecommendations` expectations

---

### F2: User Experience Level from Preferences

**Priority:** 🟡 MEDIUM - Personalization
**File:** `src/server/api/utils/plateau-detection.ts`
**Line:** 348
**Estimated Effort:** 2-3 hours

#### Current Problem

Experience level is hardcoded to "intermediate" instead of reading from user preferences:

```typescript
// Line 348
experienceLevel: "intermediate", // TODO: Get from user preferences
```

This affects:

- Plateau detection sensitivity
- Recommendation quality
- Progression rate expectations
- Volume/intensity recommendations

#### Implementation Steps

1. **Create user preferences schema (if doesn't exist)**

   ```typescript
   // src/server/db/schema/user-preferences.ts
   export const userPreferences = pgTable("user_preferences", {
     userId: text("user_id").primaryKey(),
     experienceLevel: text("experience_level", {
       enum: ["beginner", "intermediate", "advanced", "elite"],
     }).default("intermediate"),
     updatedAt: timestamp("updated_at").defaultNow(),
   });
   ```

2. **Check if user preferences table exists**
   - Search schema files for existing user preferences structure
   - File to check: `src/server/db/schema/`
   - May already exist as part of user settings

3. **Fetch user preference in plateau detection**

   ```typescript
   // In plateau-detection.ts, fetch user preferences
   const userPrefs = await db.query.userPreferences.findFirst({
     where: eq(userPreferences.userId, userId),
     columns: { experienceLevel: true }
   });

   const experienceLevel = userPrefs?.experienceLevel ?? "intermediate";

   return {
     userId,
     masterExerciseId,
     sessions: sessions.map((s) => ({ ... })),
     maintenanceMode: keyLift[0]?.maintenanceMode || false,
     experienceLevel, // Now from user preferences
   };
   ```

4. **Create user settings UI (if needed)**
   - Add experience level selector to user settings page
   - Options: Beginner, Intermediate, Advanced, Elite
   - Help text explaining each level
   - File location: `src/app/settings/page.tsx` or similar

5. **Create tRPC mutation for updating preference**

   ```typescript
   // In user settings router
   updateExperienceLevel: protectedProcedure
     .input(z.object({
       experienceLevel: z.enum(["beginner", "intermediate", "advanced", "elite"])
     }))
     .mutation(async ({ ctx, input }) => {
       await ctx.db.update(userPreferences)
         .set({ experienceLevel: input.experienceLevel, updatedAt: new Date() })
         .where(eq(userPreferences.userId, ctx.user.id));

       return { success: true };
     }),
   ```

#### Acceptance Criteria

- [ ] User preferences table created (or verified to exist)
- [ ] Experience level read from user preferences
- [ ] Falls back to "intermediate" if not set
- [ ] UI for users to set their experience level
- [ ] tRPC mutation to update preference
- [ ] Plateau detection uses actual user experience level
- [ ] Migration script if table doesn't exist

#### Files to Modify/Create

1. `src/server/api/utils/plateau-detection.ts` (line 348)
2. `src/server/db/schema/user-preferences.ts` (create or update)
3. Create user settings router or update existing
4. Create/update settings UI component
5. Create migration if needed

---

### F3: WHOOP Recovery Integration

**Priority:** 🟡 MEDIUM - Data Integration
**Files:** Multiple (3 locations)
**Estimated Effort:** 4-6 hours

#### Current Problem

WHOOP recovery data integration is stubbed out in three locations:

**1. PR Forecasting (`src/server/api/utils/pr-forecasting.ts:150`)**

```typescript
whoopRecoveryFactor: null, // TODO: Integrate WHOOP data
```

**2. Recovery Guidance Application (`src/app/_components/StrengthProgressSection.tsx:728`)**

```typescript
onRecommendationAccept={(recommendation) => {
  console.log("Recovery recommendation accepted", recommendation);
  // TODO: Apply recovery guidance for exercise progression
}}
```

**3. Recovery Guidance Modification (`src/app/_components/StrengthProgressSection.tsx:736`)**

```typescript
onRecommendationModify={(recommendation) => {
  console.log("Recovery recommendation modified", recommendation);
  // TODO: Allow modification of recovery guidance
}}
```

#### Implementation Steps

##### Part 1: Fetch WHOOP Recovery Data for PR Forecasting

1. **Check if WHOOP integration exists**
   - File: `src/server/api/routers/whoop.ts`
   - Verify WHOOP API connection and recovery data endpoints

2. **Fetch recovery data for forecast date range**

   ```typescript
   // In pr-forecasting.ts
   async function getWhoopRecoveryFactor(
     userId: string,
     startDate: Date,
     endDate: Date,
     db: Database,
   ): Promise<number | null> {
     // Query WHOOP recovery scores for the period
     const recoveryData = await db
       .select()
       .from(whoopRecoveries) // Verify table name
       .where(
         and(
           eq(whoopRecoveries.userId, userId),
           gte(whoopRecoveries.date, startDate),
           lte(whoopRecoveries.date, endDate),
         ),
       );

     if (recoveryData.length === 0) return null;

     // Calculate average recovery score
     const avgRecovery =
       recoveryData.reduce((sum, r) => sum + r.recoveryScore, 0) /
       recoveryData.length;

     // Normalize to factor (e.g., 0.8 to 1.2 range)
     // Lower recovery = lower factor = longer time to PR
     return 0.8 + (avgRecovery / 100) * 0.4;
   }
   ```

3. **Apply recovery factor to forecast**

   ```typescript
   // Line 150 in pr-forecasting.ts
   const whoopRecoveryFactor = await getWhoopRecoveryFactor(
     userId,
     thirtyDaysAgo,
     new Date(),
     db,
   );

   await db.insert(prForecasts).values({
     // ... other fields
     whoopRecoveryFactor, // Now includes actual WHOOP data
     // ... other fields
   });
   ```

##### Part 2: Apply Recovery Guidance for Exercise Progression

1. **Create recovery guidance application logic**

   ```typescript
   // New file: src/server/api/routers/recovery-guidance.ts
   export const recoveryGuidanceRouter = createTRPCRouter({
     applyRecommendation: protectedProcedure
       .input(
         z.object({
           exerciseId: z.number(),
           templateId: z.number().optional(),
           recommendation: z.object({
             suggestedAction: z.string(),
             targetWeight: z.number().optional(),
             targetReps: z.number().optional(),
             restDays: z.number().optional(),
           }),
         }),
       )
       .mutation(async ({ ctx, input }) => {
         // Apply recommendation to exercise progression
         // Update template or next workout suggestion
         // Store in exercise_progression table or similar
         // Return updated progression plan
       }),
   });
   ```

2. **Update StrengthProgressSection component**

   ```typescript
   // Line 728
   const applyRecommendation = api.recoveryGuidance.applyRecommendation.useMutation();

   onRecommendationAccept={(recommendation) => {
     applyRecommendation.mutate({
       exerciseId: selectedExerciseId,
       templateId: selectedTemplateExerciseId,
       recommendation: {
         suggestedAction: recommendation.action,
         targetWeight: recommendation.weight,
         targetReps: recommendation.reps,
         restDays: recommendation.restDays,
       }
     }, {
       onSuccess: () => {
         toast.success("Recovery guidance applied to your program");
         // Refresh data
       }
     });
   }}
   ```

##### Part 3: Allow Modification of Recovery Guidance

1. **Create modification UI/modal**

   ```typescript
   // Component: RecoveryGuidanceModifier
   const [modifiedRecommendation, setModifiedRecommendation] = useState(recommendation);

   // Allow user to adjust:
   // - Target weight/reps
   // - Rest days
   // - Action type (deload, maintain, progress)

   <Dialog open={showModifier}>
     <DialogContent>
       <h2>Modify Recovery Guidance</h2>

       <Label>Suggested Weight</Label>
       <Input
         type="number"
         value={modifiedRecommendation.weight}
         onChange={(e) => setModifiedRecommendation({
           ...modifiedRecommendation,
           weight: Number(e.target.value)
         })}
       />

       {/* Similar inputs for reps, rest days, etc. */}

       <Button onClick={() => {
         applyRecommendation.mutate({
           exerciseId,
           recommendation: modifiedRecommendation
         });
       }}>
         Apply Modified Guidance
       </Button>
     </DialogContent>
   </Dialog>
   ```

2. **Update component handler**
   ```typescript
   // Line 736
   onRecommendationModify={(recommendation) => {
     setShowModifier(true);
     setCurrentRecommendation(recommendation);
   }}
   ```

#### Acceptance Criteria

- [ ] WHOOP recovery data fetched for PR forecasting periods
- [ ] Recovery factor calculated and stored in forecasts
- [ ] Recovery guidance can be applied to exercise progression
- [ ] Applied guidance updates workout templates/plans
- [ ] Users can modify recommendations before applying
- [ ] Modified recommendations validated (reasonable ranges)
- [ ] UI feedback when guidance applied/modified
- [ ] Existing WHOOP integration not broken

#### Files to Modify/Create

1. `src/server/api/utils/pr-forecasting.ts` (line 150)
2. `src/app/_components/StrengthProgressSection.tsx` (lines 728, 736)
3. Create `src/server/api/routers/recovery-guidance.ts` (new router)
4. Verify/update `src/server/db/schema/` for recovery guidance storage
5. Create `RecoveryGuidanceModifier` component (new)
6. Update root router to include recovery guidance router

---

## IMPLEMENTATION STRATEGY

### Recommended Order

**Phase 1: Performance (Week 1-2)**

1. P1: Fix N+1 queries in milestone checking (CRITICAL for database load)
2. P2: Optimize plateau detection calls (builds on P1)
3. P3: Extract workout save service (makes future optimizations easier)

**Phase 2: Code Quality (Week 3)** 4. Q1: Remove code duplication in exercises.ts (CRITICAL for maintainability) 5. Q2: Replace `any` types (start with exercises.ts, will be easier after Q1) 6. Q4: Extract shared utilities (reduce duplication)

**Phase 3: Polish (Week 3-4)** 7. Q3: Replace console.log with logger 8. Q5: Clean up backup files

**Phase 4: Feature Enhancements (Week 5)** 9. F1: Fetch actual session data for plateau analysis 10. F2: User experience level from preferences 11. F3: WHOOP recovery integration

### Testing Strategy

After each refactoring task:

1. Run type check: `bun check`
2. Run existing tests: `bun run test`
3. Test manually in development: `bun dev`
4. Verify no behavioral changes

### Rollback Plan

Each task should be a separate commit or PR:

- Easy to revert if issues arise
- Easy to review changes
- Can cherry-pick individual improvements

---

## NOTES FOR AGENT EXECUTING THIS

### Important Context

- **D1 Database Constraints**: This project uses Cloudflare D1 which has a ~90 SQL variable limit. The codebase already uses chunking helpers from `src/server/db/chunk-utils.ts` properly. Don't break this.

- **Offline-First Architecture**: Changes should maintain offline-first patterns. Don't break optimistic updates or queueing.

- **Type Safety**: The codebase uses Drizzle ORM which provides excellent type inference. Use it properly.

- **Logger Already Exists**: `src/server/logger` is already set up and used in some places. Just need to standardize usage.

### Before Starting

1. Read `CLAUDE.md` for project context
2. Run `bun check` to ensure baseline is clean
3. Run `bun run test` to ensure tests pass

### During Implementation

1. Make small, atomic commits
2. Test after each change
3. If something breaks, revert and reassess
4. Keep database chunking patterns intact
5. Don't change behavior, only refactor structure

### After Each Task

1. Run `bun check` (TypeScript + linting)
2. Run `bun run test` (existing tests)
3. Test critical flows manually
4. Document any discovered issues

### Red Flags to Watch For

- Database queries without chunking for bulk operations
- Breaking changes to tRPC API contracts
- Type errors after removing `any`
- Test failures after refactoring
- Performance regressions

---

## ESTIMATED TOTAL EFFORT

- **Performance Tasks (P1-P3)**: 9-12 hours
- **Code Quality Tasks (Q1-Q5)**: 7-9 hours
- **Feature Enhancements (F1-F3)**: 8-12 hours
- **Total**: 24-33 hours

This can be split across multiple agents or sessions. Prioritize performance tasks first as they have the most user impact, then code quality, and finally feature enhancements.
