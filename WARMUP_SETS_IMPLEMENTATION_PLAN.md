# Warm-Up Sets Feature: Implementation Plan

**Created**: 2025-11-18
**Status**: Planning Phase
**Complexity**: High (touches database, UI, analytics, AI)

---

## 🎯 Executive Summary

This document outlines the implementation of intelligent warm-up set suggestions throughout Swole Tracker, including AI playbooks, manual templates, and live workout tracking.

### Core Requirements
- **Learn from history**: Detect user's warm-up patterns from workout data
- **Smart defaults**: Use standard protocols when no history exists
- **Flexible editing**: Users can review, edit, and override suggestions
- **Template integration**: Save warm-up strategies in templates
- **Playbook integration**: AI generates warm-up prescriptions
- **Analytics separation**: Track working vs warm-up volume independently

---

## 📋 User Requirements Summary

Based on user responses, the feature will:

1. **Learning Approach**: Hybrid (history when available, protocol as fallback)
2. **Pattern Detection**: Progressive weight pattern by default, with RPE/labeling options
3. **Display Format**: Explicit ladder (Set 1: 60kg×5, Set 2: 80kg×5, etc.)
4. **Scope**: Templates, AI playbooks, live workouts
5. **Adaptation**: Scale proportionally with user adjustment capability
6. **Priority**: Per-exercise patterns (not session-wide or movement-wide initially)
7. **Database**: New `exercise_sets` table with careful migration
8. **User Control**: Review/Edit + Template Override + Live Adjustment
9. **Default Protocol**: Ask user on first use, save to preferences
10. **Migration**: Intelligent backfill of historical data
11. **Volume Tracking**: Separate warm-up/working volume, emphasize working sets
12. **RPE**: Skip for warm-up sets (optional only)
13. **Template Weights**: Hybrid (save absolute + relative, user chooses at workout start)
14. **Live UX**: Smart suggestions with accept/reject/modify
15. **Pattern Threshold**: Intelligent thresholds (1 session = default, 2-3 = pattern emerging, 5+ = confident)
16. **Pattern Variance**: Use most recent pattern, user can manually adjust
17. **Exercise Similarity**: ML-based similarity with user opt-in

---

## 🗄️ Phase 1: Database Schema & Migration

### 1.1 New `exercise_sets` Table

**File**: `src/server/db/schema.ts`

```typescript
export const exerciseSets = createTable(
  "exercise_set",
  {
    id: text("id")
      .notNull()
      .primaryKey()
      .$defaultFn(() => createId()),
    sessionExerciseId: text("session_exercise_id")
      .notNull()
      .references(() => sessionExercises.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Set details
    setNumber: integer("set_number").notNull(), // 1, 2, 3, etc.
    setType: text("set_type", { enum: ["warmup", "working", "backoff", "drop"] })
      .notNull()
      .default("working"),

    // Performance data
    weight: real("weight"), // kg (can be null for bodyweight)
    reps: integer("reps").notNull(),
    rpe: integer("rpe"), // 1-10, optional (skip for warm-ups)
    restSeconds: integer("rest_seconds"),

    // Metadata
    completed: integer("completed", { mode: "boolean" }).default(false),
    notes: text("notes"),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => ({
    sessionExerciseIdx: index("exercise_set_session_exercise_idx").on(table.sessionExerciseId),
    userIdx: index("exercise_set_user_idx").on(table.userId),
    setNumberIdx: index("exercise_set_number_idx").on(table.sessionExerciseId, table.setNumber),
  })
);

export type ExerciseSet = typeof exerciseSets.$inferSelect;
export type NewExerciseSet = typeof exerciseSets.$inferInsert;
```

### 1.2 Update `sessionExercises` Table

**Keep existing fields for backward compatibility**, add:

```typescript
export const sessionExercises = createTable(
  "session_exercise",
  {
    // ... existing fields ...

    // NEW: Legacy flag for migration
    usesSetTable: integer("uses_set_table", { mode: "boolean" }).default(false),

    // NEW: Aggregated stats (computed from exercise_sets)
    totalSets: integer("total_sets"), // Total count (warm-up + working)
    workingSets: integer("working_sets"), // Working sets only
    warmupSets: integer("warmup_sets"), // Warm-up sets only
    topSetWeight: real("top_set_weight"), // Heaviest weight
    totalVolume: real("total_volume"), // All volume
    workingVolume: real("working_volume"), // Working sets only
  }
);
```

### 1.3 Migration Strategy

**File**: `drizzle/migrations/0014_add_exercise_sets_table.sql`

```sql
-- Create exercise_sets table
CREATE TABLE exercise_set (
  id TEXT PRIMARY KEY NOT NULL,
  session_exercise_id TEXT NOT NULL REFERENCES session_exercise(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'working' CHECK(set_type IN ('warmup', 'working', 'backoff', 'drop')),
  weight REAL,
  reps INTEGER NOT NULL,
  rpe INTEGER,
  rest_seconds INTEGER,
  completed INTEGER DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
);

CREATE INDEX exercise_set_session_exercise_idx ON exercise_set(session_exercise_id);
CREATE INDEX exercise_set_user_idx ON exercise_set(user_id);
CREATE INDEX exercise_set_number_idx ON exercise_set(session_exercise_id, set_number);

-- Add new columns to session_exercise
ALTER TABLE session_exercise ADD COLUMN uses_set_table INTEGER DEFAULT 0;
ALTER TABLE session_exercise ADD COLUMN total_sets INTEGER;
ALTER TABLE session_exercise ADD COLUMN working_sets INTEGER;
ALTER TABLE session_exercise ADD COLUMN warmup_sets INTEGER;
ALTER TABLE session_exercise ADD COLUMN top_set_weight REAL;
ALTER TABLE session_exercise ADD COLUMN total_volume REAL;
ALTER TABLE session_exercise ADD COLUMN working_volume REAL;
```

### 1.4 Intelligent Backfill Script

**File**: `scripts/backfill-exercise-sets.ts`

```typescript
/**
 * Intelligently backfills exercise_sets from session_exercises
 *
 * Strategy:
 * 1. Find sessions with multiple sets recorded (aggregated format)
 * 2. Detect warm-up pattern: progressive weight increase to top set
 * 3. Create individual exercise_set rows
 * 4. Mark session_exercise as migrated (uses_set_table = true)
 */

import { db } from "~/server/db";
import { sessionExercises, exerciseSets } from "~/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { chunkedBatch } from "~/server/db/chunk-utils";

interface SetDetectionResult {
  warmupSets: Array<{ weight: number; reps: number }>;
  workingSets: Array<{ weight: number; reps: number }>;
}

async function detectWarmupPattern(
  exercise: typeof sessionExercises.$inferSelect
): Promise<SetDetectionResult> {
  // If only 1 set, it's a working set
  if (exercise.sets === 1) {
    return {
      warmupSets: [],
      workingSets: [{ weight: exercise.weight ?? 0, reps: exercise.reps ?? 0 }],
    };
  }

  // Fetch user's history for this exercise to detect typical pattern
  const history = await db
    .select()
    .from(sessionExercises)
    .where(
      and(
        eq(sessionExercises.userId, exercise.userId),
        eq(sessionExercises.exerciseName, exercise.exerciseName),
        isNull(sessionExercises.usesSetTable) // Only legacy data
      )
    )
    .orderBy(sessionExercises.createdAt)
    .limit(10);

  // Analyze: If this exercise typically has 3+ sets, assume first 40-80% are warm-ups
  const avgSets = history.reduce((sum, h) => sum + (h.sets ?? 1), 0) / history.length;

  if (avgSets >= 3 && exercise.sets && exercise.sets >= 3) {
    // Estimate warm-up ladder: 60% → 80% → 90% → 100%
    const topWeight = exercise.weight ?? 0;
    const topReps = exercise.reps ?? 0;
    const warmupCount = Math.min(3, exercise.sets - 1);

    const warmups = [];
    for (let i = 0; i < warmupCount; i++) {
      const percentage = 0.6 + (i * 0.15); // 60%, 75%, 90%
      warmups.push({
        weight: Math.round((topWeight * percentage) / 2.5) * 2.5, // Round to 2.5kg
        reps: topReps, // Same reps as working set (conservative estimate)
      });
    }

    const workingCount = exercise.sets - warmupCount;
    const workings = Array(workingCount).fill({
      weight: topWeight,
      reps: topReps,
    });

    return { warmupSets: warmups, workingSets: workings };
  }

  // Default: All sets are working sets
  return {
    warmupSets: [],
    workingSets: Array(exercise.sets ?? 1).fill({
      weight: exercise.weight ?? 0,
      reps: exercise.reps ?? 0,
    }),
  };
}

async function backfillExerciseSets() {
  console.log("Starting exercise_sets backfill...");

  // Get all legacy session_exercises
  const legacyExercises = await db
    .select()
    .from(sessionExercises)
    .where(isNull(sessionExercises.usesSetTable));

  console.log(`Found ${legacyExercises.length} legacy exercises to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const exercise of legacyExercises) {
    try {
      // Detect warm-up pattern
      const { warmupSets, workingSets } = await detectWarmupPattern(exercise);

      // Create exercise_set rows
      const newSets: typeof exerciseSets.$inferInsert[] = [];
      let setNumber = 1;

      // Add warm-up sets
      for (const warmup of warmupSets) {
        newSets.push({
          sessionExerciseId: exercise.id,
          userId: exercise.userId,
          setNumber: setNumber++,
          setType: "warmup",
          weight: warmup.weight,
          reps: warmup.reps,
          completed: true, // Historical data is completed
          createdAt: exercise.createdAt,
          completedAt: exercise.createdAt,
        });
      }

      // Add working sets
      for (const working of workingSets) {
        newSets.push({
          sessionExerciseId: exercise.id,
          userId: exercise.userId,
          setNumber: setNumber++,
          setType: "working",
          weight: working.weight,
          reps: working.reps,
          rpe: exercise.rpe, // Apply RPE to working sets only
          completed: true,
          createdAt: exercise.createdAt,
          completedAt: exercise.createdAt,
        });
      }

      // Insert in chunks (D1 variable limit!)
      await chunkedBatch(db, newSets, async (chunk) => {
        await db.insert(exerciseSets).values(chunk);
      });

      // Update session_exercise with aggregated stats
      const totalVolume = newSets.reduce((sum, s) => sum + (s.weight ?? 0) * s.reps, 0);
      const workingVolume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

      await db
        .update(sessionExercises)
        .set({
          usesSetTable: true,
          totalSets: newSets.length,
          workingSets: workingSets.length,
          warmupSets: warmupSets.length,
          topSetWeight: Math.max(...newSets.map(s => s.weight ?? 0)),
          totalVolume,
          workingVolume,
        })
        .where(eq(sessionExercises.id, exercise.id));

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`Migrated ${migrated}/${legacyExercises.length} exercises...`);
      }
    } catch (error) {
      console.error(`Failed to migrate exercise ${exercise.id}:`, error);
      skipped++;
    }
  }

  console.log(`✅ Backfill complete: ${migrated} migrated, ${skipped} skipped`);
}

// Run migration
backfillExerciseSets().catch(console.error);
```

**Run after migration**: `infisical run -- bun scripts/backfill-exercise-sets.ts`

---

## ⚙️ Phase 2: Warm-Up Preferences

### 2.1 Extend Preferences Schema

**File**: `src/server/db/schema.ts`

```typescript
export const preferences = createTable("preference", {
  // ... existing fields ...

  // NEW: Warm-up configuration
  warmupStrategy: text("warmup_strategy", {
    enum: ["percentage", "fixed", "history", "none"]
  }).default("history"),
  warmupSetsCount: integer("warmup_sets_count").default(3),
  warmupPercentages: text("warmup_percentages").default("[40, 60, 80]"), // JSON array
  warmupRepsStrategy: text("warmup_reps_strategy", {
    enum: ["match_working", "descending", "fixed"]
  }).default("match_working"),
  warmupFixedReps: integer("warmup_fixed_reps").default(5),

  // Movement pattern sharing (future feature)
  enableMovementPatternSharing: integer("enable_movement_pattern_sharing", {
    mode: "boolean"
  }).default(false),
});
```

### 2.2 Add Warm-Up Section to Preferences UI

**File**: `src/app/_components/PreferencesModal.tsx`

Insert after workout tracking section (~line 400):

```tsx
{/* Warm-Up Configuration */}
<section>
  <h3 className="text-lg font-semibold">Warm-Up Sets</h3>
  <p className="text-sm text-muted-foreground">
    Configure how warm-up sets are suggested before working sets
  </p>

  {/* First-time setup prompt */}
  {!hasConfiguredWarmup && (
    <div className="glass-surface glass-hairline rounded-lg border-l-4 border-l-primary p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="size-5 text-primary" />
        <div>
          <p className="font-medium">Set your default warm-up protocol</p>
          <p className="text-sm text-muted-foreground">
            We'll use this when you start new exercises. You can always adjust per workout.
          </p>
        </div>
      </div>
    </div>
  )}

  {/* Strategy Selection */}
  <div role="radiogroup" aria-labelledby="warmup-strategy-label">
    <label id="warmup-strategy-label" className="mb-2 block text-sm font-medium">
      Default Strategy
    </label>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {/* History-based */}
      <Button
        variant={warmupStrategy === "history" ? "default" : "outline"}
        className="h-auto flex-col items-start p-4"
        onClick={() => setWarmupStrategy("history")}
        role="radio"
        aria-checked={warmupStrategy === "history"}
      >
        <span className="text-lg">📊</span>
        <span className="font-semibold">Smart (Recommended)</span>
        <span className="text-xs opacity-70">
          Learn from your history, use protocol as fallback
        </span>
      </Button>

      {/* Percentage-based */}
      <Button
        variant={warmupStrategy === "percentage" ? "default" : "outline"}
        className="h-auto flex-col items-start p-4"
        onClick={() => setWarmupStrategy("percentage")}
        role="radio"
        aria-checked={warmupStrategy === "percentage"}
      >
        <span className="text-lg">📈</span>
        <span className="font-semibold">Percentage Protocol</span>
        <span className="text-xs opacity-70">
          Fixed percentages: 40% → 60% → 80%
        </span>
      </Button>

      {/* Fixed weights */}
      <Button
        variant={warmupStrategy === "fixed" ? "default" : "outline"}
        className="h-auto flex-col items-start p-4"
        onClick={() => setWarmupStrategy("fixed")}
        role="radio"
        aria-checked={warmupStrategy === "fixed"}
      >
        <span className="text-lg">⚖️</span>
        <span className="font-semibold">Fixed Weights</span>
        <span className="text-xs opacity-70">
          Always use: 20kg → 40kg → 60kg
        </span>
      </Button>

      {/* None */}
      <Button
        variant={warmupStrategy === "none" ? "default" : "outline"}
        className="h-auto flex-col items-start p-4"
        onClick={() => setWarmupStrategy("none")}
        role="radio"
        aria-checked={warmupStrategy === "none"}
      >
        <span className="text-lg">⏭️</span>
        <span className="font-semibold">No Warm-Ups</span>
        <span className="text-xs opacity-70">
          Skip warm-up suggestions
        </span>
      </Button>
    </div>
  </div>

  {/* Percentage Configuration (conditional) */}
  {warmupStrategy === "percentage" && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="glass-surface glass-hairline rounded-lg p-4"
    >
      <label className="mb-2 block text-sm font-medium">
        Warm-up Percentages
      </label>
      <div className="flex items-center gap-2">
        {warmupPercentages.map((pct, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <input
              type="number"
              min="20"
              max="95"
              step="5"
              value={pct}
              onChange={(e) => updatePercentage(idx, Number(e.target.value))}
              className="w-16 rounded-md border px-2 py-1 text-center"
            />
            <span className="text-sm">%</span>
            {idx < warmupPercentages.length - 1 && (
              <span className="text-muted-foreground">→</span>
            )}
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={addPercentageStep}
          disabled={warmupPercentages.length >= 5}
        >
          + Add Step
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Example: For 100kg working set → {warmupPercentages.map(p => `${p}kg`).join(" → ")}
      </p>
    </motion.div>
  )}

  {/* Number of Sets (for percentage/fixed strategies) */}
  {warmupStrategy !== "none" && warmupStrategy !== "history" && (
    <div>
      <label className="mb-2 block text-sm font-medium">
        Number of Warm-up Sets
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            variant={warmupSetsCount === n ? "default" : "outline"}
            className="h-10 w-10"
            onClick={() => setWarmupSetsCount(n)}
          >
            {n}
          </Button>
        ))}
      </div>
    </div>
  )}

  {/* Reps Strategy */}
  {warmupStrategy !== "none" && (
    <div>
      <label className="mb-2 block text-sm font-medium">
        Warm-up Reps
      </label>
      <div className="flex gap-2">
        <Button
          variant={warmupRepsStrategy === "match_working" ? "default" : "outline"}
          onClick={() => setWarmupRepsStrategy("match_working")}
        >
          Match Working Sets
        </Button>
        <Button
          variant={warmupRepsStrategy === "descending" ? "default" : "outline"}
          onClick={() => setWarmupRepsStrategy("descending")}
        >
          Descending (10→8→6)
        </Button>
        <Button
          variant={warmupRepsStrategy === "fixed" ? "default" : "outline"}
          onClick={() => setWarmupRepsStrategy("fixed")}
        >
          Fixed ({warmupFixedReps} reps)
        </Button>
      </div>
    </div>
  )}
</section>
```

---

## 🧠 Phase 3: Pattern Detection Algorithm

### 3.1 Warm-Up Pattern Detection Utility

**File**: `src/server/api/utils/warmup-pattern-detection.ts`

```typescript
import { db } from "~/server/db";
import { exerciseSets, sessionExercises } from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface WarmupPattern {
  confidence: "low" | "medium" | "high";
  sets: Array<{
    weight: number;
    reps: number;
    percentageOfTop: number;
  }>;
  source: "history" | "protocol" | "default";
  sessionCount: number; // How many sessions this pattern is based on
}

export interface WarmupDetectionOptions {
  userId: string;
  exerciseName: string;
  targetWorkingWeight: number;
  targetWorkingReps: number;
  minSessions?: number; // Min sessions to consider pattern (default: 2)
  lookbackSessions?: number; // How far back to look (default: 10)
}

/**
 * Detects user's warm-up pattern for a specific exercise
 */
export async function detectWarmupPattern(
  options: WarmupDetectionOptions
): Promise<WarmupPattern> {
  const {
    userId,
    exerciseName,
    targetWorkingWeight,
    targetWorkingReps,
    minSessions = 2,
    lookbackSessions = 10,
  } = options;

  // Fetch recent sessions with this exercise
  const recentSessions = await db
    .select({
      sessionExercise: sessionExercises,
      sets: sql<string>`GROUP_CONCAT(
        json_object(
          'setNumber', ${exerciseSets.setNumber},
          'setType', ${exerciseSets.setType},
          'weight', ${exerciseSets.weight},
          'reps', ${exerciseSets.reps}
        ),
        '|||'
      )`,
    })
    .from(sessionExercises)
    .leftJoin(exerciseSets, eq(exerciseSets.sessionExerciseId, sessionExercises.id))
    .where(
      and(
        eq(sessionExercises.userId, userId),
        eq(sessionExercises.exerciseName, exerciseName),
        eq(sessionExercises.usesSetTable, true) // Only migrated data
      )
    )
    .groupBy(sessionExercises.id)
    .orderBy(desc(sessionExercises.createdAt))
    .limit(lookbackSessions);

  // Not enough history
  if (recentSessions.length < minSessions) {
    return {
      confidence: "low",
      sets: [],
      source: "protocol",
      sessionCount: 0,
    };
  }

  // Parse sets and extract warm-up patterns
  const patterns: Array<Array<{ weight: number; reps: number }>> = [];

  for (const session of recentSessions) {
    if (!session.sets) continue;

    const sets = session.sets
      .split("|||")
      .map((s) => JSON.parse(s))
      .filter((s: any) => s.setType === "warmup")
      .sort((a: any, b: any) => a.setNumber - b.setNumber);

    if (sets.length > 0) {
      patterns.push(
        sets.map((s: any) => ({ weight: s.weight ?? 0, reps: s.reps ?? 0 }))
      );
    }
  }

  // No consistent warm-up usage
  if (patterns.length === 0) {
    return {
      confidence: "low",
      sets: [],
      source: "protocol",
      sessionCount: recentSessions.length,
    };
  }

  // Use most recent pattern (user's latest preference)
  const mostRecentPattern = patterns[0];

  // Scale to target working weight
  const lastSession = recentSessions[0];
  const topWeightLastSession = lastSession.sessionExercise.topSetWeight ?? targetWorkingWeight;

  const scaledSets = mostRecentPattern.map((warmup) => ({
    weight: Math.round(
      ((warmup.weight / topWeightLastSession) * targetWorkingWeight) / 2.5
    ) * 2.5,
    reps: warmup.reps,
    percentageOfTop: warmup.weight / topWeightLastSession,
  }));

  // Determine confidence
  let confidence: "low" | "medium" | "high" = "low";
  if (patterns.length >= 5) confidence = "high";
  else if (patterns.length >= 2) confidence = "medium";

  return {
    confidence,
    sets: scaledSets,
    source: "history",
    sessionCount: patterns.length,
  };
}

/**
 * Generates default warm-up protocol when no history exists
 */
export function generateDefaultWarmupProtocol(
  workingWeight: number,
  workingReps: number,
  preferences: {
    strategy: "percentage" | "fixed";
    percentages?: number[];
    setsCount?: number;
    repsStrategy?: "match_working" | "descending" | "fixed";
    fixedReps?: number;
  }
): WarmupPattern["sets"] {
  const { strategy, percentages = [40, 60, 80], setsCount = 3, repsStrategy = "match_working", fixedReps = 5 } = preferences;

  const sets: WarmupPattern["sets"] = [];

  for (let i = 0; i < setsCount; i++) {
    const percentage = percentages[i] ?? percentages[percentages.length - 1];
    const weight = Math.round((workingWeight * (percentage / 100)) / 2.5) * 2.5;

    let reps: number;
    if (repsStrategy === "match_working") {
      reps = workingReps;
    } else if (repsStrategy === "descending") {
      reps = Math.max(5, 10 - i * 2); // 10, 8, 6, 5, 5...
    } else {
      reps = fixedReps;
    }

    sets.push({ weight, reps, percentageOfTop: percentage / 100 });
  }

  return sets;
}

/**
 * ML-based exercise similarity (future feature)
 * Returns similar exercises that could share warm-up patterns
 */
export async function findSimilarExercises(
  exerciseName: string,
  userId: string
): Promise<Array<{ exerciseName: string; similarity: number }>> {
  // TODO: Implement ML-based similarity
  // For now, use simple string matching for variants
  const variants = [
    { pattern: /barbell bench press/i, related: ["dumbbell bench press", "incline bench press"] },
    { pattern: /squat/i, related: ["front squat", "goblet squat", "hack squat"] },
    { pattern: /deadlift/i, related: ["romanian deadlift", "sumo deadlift", "trap bar deadlift"] },
  ];

  for (const variant of variants) {
    if (variant.pattern.test(exerciseName)) {
      return variant.related.map((name) => ({ exerciseName: name, similarity: 0.8 }));
    }
  }

  return [];
}
```

---

## 🎨 Phase 4: UI Components

### 4.1 WarmupSetInput Component

**File**: `src/app/_components/workout/WarmupSetInput.tsx`

```tsx
"use client";

import { motion } from "framer-motion";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "~/lib/utils";

export interface WarmupSetData {
  setNumber: number;
  weight: number;
  reps: number;
  percentageOfTop?: number;
}

interface WarmupSetInputProps {
  data: WarmupSetData;
  weightUnit: "kg" | "lbs";
  onUpdate: (updates: Partial<WarmupSetData>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDragging?: boolean;
}

export function WarmupSetInput({
  data,
  weightUnit,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isDragging,
}: WarmupSetInputProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "glass-card glass-hairline relative flex items-center gap-2 rounded-lg p-2 transition-colors",
        "bg-secondary/5", // Distinguish from working sets
        isDragging && "opacity-50"
      )}
    >
      {/* Drag Handle */}
      <div
        className="cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing"
        data-drag-handle="true"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </div>

      {/* Set Number Badge */}
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/30 text-xs font-semibold text-secondary-foreground">
        W{data.setNumber}
      </div>

      {/* Weight Input */}
      <div className="flex flex-1 items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          value={data.weight || ""}
          onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          className="input-primary w-16 rounded-md border px-2 py-1 text-center text-sm"
          aria-label={`Warm-up set ${data.setNumber} weight`}
        />
        <span className="text-xs text-muted-foreground">{weightUnit}</span>
      </div>

      {/* Reps Input */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">×</span>
        <input
          type="number"
          inputMode="numeric"
          value={data.reps || ""}
          onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
          placeholder="0"
          className="input-primary w-12 rounded-md border px-2 py-1 text-center text-sm"
          aria-label={`Warm-up set ${data.setNumber} reps`}
        />
      </div>

      {/* Percentage Badge (if available) */}
      {data.percentageOfTop && (
        <div className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {Math.round(data.percentageOfTop * 100)}%
        </div>
      )}

      {/* Move Up/Down Arrows */}
      <div className="flex flex-col gap-0.5">
        {onMoveUp && (
          <button
            onClick={onMoveUp}
            className="rounded p-0.5 hover:bg-muted"
            aria-label="Move set up"
          >
            ↑
          </button>
        )}
        {onMoveDown && (
          <button
            onClick={onMoveDown}
            className="rounded p-0.5 hover:bg-muted"
            aria-label="Move set down"
          >
            ↓
          </button>
        )}
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="rounded p-1 text-destructive hover:bg-destructive/10"
        aria-label={`Delete warm-up set ${data.setNumber}`}
      >
        <Trash2 className="size-4" />
      </button>
    </motion.div>
  );
}
```

### 4.2 WarmupSection Component

**File**: `src/app/_components/workout/WarmupSection.tsx`

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Zap, Plus, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { WarmupSetInput, type WarmupSetData } from "./WarmupSetInput";
import { cn } from "~/lib/utils";

interface WarmupSectionProps {
  exerciseName: string;
  warmupSets: WarmupSetData[];
  workingWeight?: number;
  weightUnit: "kg" | "lbs";
  onUpdate: (sets: WarmupSetData[]) => void;
  onAutoFill: () => void;
  suggestedSets?: WarmupSetData[]; // From AI/pattern detection
  className?: string;
}

export function WarmupSection({
  exerciseName,
  warmupSets,
  workingWeight,
  weightUnit,
  onUpdate,
  onAutoFill,
  suggestedSets,
  className,
}: WarmupSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(!!suggestedSets && warmupSets.length === 0);

  const handleUpdateSet = (index: number, updates: Partial<WarmupSetData>) => {
    const updated = [...warmupSets];
    updated[index] = { ...updated[index], ...updates };
    onUpdate(updated);
  };

  const handleDeleteSet = (index: number) => {
    const updated = warmupSets.filter((_, i) => i !== index);
    // Renumber sets
    const renumbered = updated.map((set, i) => ({ ...set, setNumber: i + 1 }));
    onUpdate(renumbered);
  };

  const handleMoveSet = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= warmupSets.length) return;

    const updated = [...warmupSets];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    // Renumber
    const renumbered = updated.map((set, i) => ({ ...set, setNumber: i + 1 }));
    onUpdate(renumbered);
  };

  const handleAddSet = () => {
    const newSet: WarmupSetData = {
      setNumber: warmupSets.length + 1,
      weight: 0,
      reps: 5,
    };
    onUpdate([...warmupSets, newSet]);
  };

  const handleApplySuggestion = () => {
    if (suggestedSets) {
      onUpdate(suggestedSets);
      setShowSuggestion(false);
    }
  };

  const totalWarmupVolume = warmupSets.reduce((sum, set) => sum + set.weight * set.reps, 0);

  return (
    <div className={cn("glass-surface glass-hairline rounded-lg border-l-4 border-l-secondary/50", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-secondary/5"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Warm-up Sets ({warmupSets.length})
          </span>
          {warmupSets.length > 0 && (
            <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {totalWarmupVolume.toFixed(0)}{weightUnit} moved
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="size-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-3 pb-3">
              {/* Suggestion Banner */}
              {showSuggestion && suggestedSets && suggestedSets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-surface hover:glass-hairline flex items-center justify-between rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Smart Suggestion</p>
                      <p className="text-xs text-muted-foreground">
                        Based on your history: {suggestedSets.map(s => `${s.weight}${weightUnit}`).join(" → ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSuggestion(false)}
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleApplySuggestion}
                    >
                      Apply
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Warm-up Set Inputs */}
              <AnimatePresence>
                {warmupSets.map((set, index) => (
                  <WarmupSetInput
                    key={`warmup-${set.setNumber}`}
                    data={set}
                    weightUnit={weightUnit}
                    onUpdate={(updates) => handleUpdateSet(index, updates)}
                    onDelete={() => handleDeleteSet(index)}
                    onMoveUp={index > 0 ? () => handleMoveSet(index, "up") : undefined}
                    onMoveDown={index < warmupSets.length - 1 ? () => handleMoveSet(index, "down") : undefined}
                  />
                ))}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSet}
                  className="flex-1"
                >
                  <Plus className="size-4" />
                  Add Set
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAutoFill}
                  className="flex-1"
                >
                  <Zap className="size-4" />
                  Auto Fill
                </Button>
                {warmupSets.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate([])}
                  >
                    <RotateCcw className="size-4" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Footer Info */}
              {warmupSets.length > 0 && workingWeight && (
                <div className="border-t bg-gradient-to-r from-secondary/5 to-primary/5 px-3 py-2">
                  <p className="text-xs">
                    <span className="font-medium">Progressive load:</span>{" "}
                    <span className="font-bold text-secondary">
                      {warmupSets.map(s => `${s.weight}${weightUnit}`).join(" → ")} → {workingWeight}{weightUnit}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 4.3 Integrate into ExerciseCard

**File**: `src/app/_components/exercise-card.tsx`

Insert warm-up section after insights row (~line 500):

```tsx
{/* Warm-Up Section */}
{hasWarmupSets && (
  <WarmupSection
    exerciseName={exercise.exerciseName}
    warmupSets={warmupSets}
    workingWeight={topWorkingSetWeight}
    weightUnit={userPreferences.weightUnit}
    onUpdate={handleWarmupUpdate}
    onAutoFill={handleAutoFillWarmup}
    suggestedSets={suggestedWarmupSets}
    className="mb-3"
  />
)}
```

---

## 📊 Phase 5: Analytics & Volume Tracking

### 5.1 Update Volume Calculation Utilities

**File**: `src/server/api/utils/volume-calculations.ts`

```typescript
export interface VolumeBreakdown {
  total: number;
  working: number;
  warmup: number;
  backoff: number;
  drop: number;
}

export function calculateVolumeBreakdown(
  sets: Array<{ weight: number; reps: number; setType: string }>
): VolumeBreakdown {
  const breakdown: VolumeBreakdown = {
    total: 0,
    working: 0,
    warmup: 0,
    backoff: 0,
    drop: 0,
  };

  for (const set of sets) {
    const volume = (set.weight ?? 0) * set.reps;
    breakdown.total += volume;

    switch (set.setType) {
      case "warmup":
        breakdown.warmup += volume;
        break;
      case "working":
        breakdown.working += volume;
        break;
      case "backoff":
        breakdown.backoff += volume;
        break;
      case "drop":
        breakdown.drop += volume;
        break;
    }
  }

  return breakdown;
}
```

### 5.2 Update Dashboard to Show Volume Breakdown

**File**: `src/app/_components/ProgressHighlightsSection.tsx`

Add volume breakdown card:

```tsx
<Card variant="glass" className="p-6">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">Working Volume</h3>
      <p className="text-3xl font-bold">{workingVolume.toLocaleString()}kg</p>
      <p className="text-xs text-muted-foreground">
        +{warmupVolume.toLocaleString()}kg warm-up
      </p>
    </div>
    <TrendingUp className="size-8 text-primary" />
  </div>

  {/* Volume Breakdown Bar */}
  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
    <div className="flex h-full">
      <div
        className="bg-secondary/50"
        style={{ width: `${(warmupVolume / totalVolume) * 100}%` }}
        title={`Warm-up: ${warmupVolume}kg`}
      />
      <div
        className="bg-primary"
        style={{ width: `${(workingVolume / totalVolume) * 100}%` }}
        title={`Working: ${workingVolume}kg`}
      />
    </div>
  </div>
</Card>
```

---

## 🤖 Phase 6: Playbook AI Integration

### 6.1 Update AI Prompt to Include Warm-Ups

**File**: `src/lib/ai-prompts/playbook-generation.ts`

Update output schema (lines 3-44):

```typescript
export const playbookOutputSchema = `{
  "weeks": [
    {
      "weekNumber": 1,
      "sessions": [
        {
          "sessionNumber": 1,
          "exercises": [
            {
              "exerciseName": "Bench Press",
              "warmupSets": [
                { "weight": 40, "reps": 8, "percentageOfTop": 40 },
                { "weight": 60, "reps": 6, "percentageOfTop": 60 },
                { "weight": 80, "reps": 4, "percentageOfTop": 80 }
              ],
              "workingSets": [
                { "weight": 100, "reps": 5, "sets": 5 }
              ],
              "restSeconds": 180,
              "notes": "Focus on controlled eccentric"
            }
          ]
        }
      ]
    }
  ]
}`;
```

Update system prompt to instruct on warm-ups:

```typescript
**Warm-Up Protocol**:
- Generate 2-4 warm-up sets before working sets
- Progress from 40-50% → 80-90% of working weight
- Use user's historical warm-up pattern when available (provided in context)
- Reduce reps as weight increases (e.g., 10 reps @ 40%, 5 reps @ 60%, 2 reps @ 80%)
- Warm-ups should prepare muscles without causing fatigue
```

### 6.2 Include Warm-Up Patterns in Context

**File**: `src/server/api/utils/playbook-context.ts`

Add to context building:

```typescript
// Fetch warm-up patterns for target exercises
const warmupPatterns = await Promise.all(
  targetExercises.map(async (exerciseName) => {
    const pattern = await detectWarmupPattern({
      userId,
      exerciseName,
      targetWorkingWeight: oneRMs.get(exerciseName) ?? 100,
      targetWorkingReps: 5,
    });

    return {
      exerciseName,
      pattern: pattern.sets,
      confidence: pattern.confidence,
      sessionCount: pattern.sessionCount,
    };
  })
);

// Include in prompt
const warmupPatternsText = warmupPatterns
  .filter(p => p.confidence !== "low")
  .map(p => `${p.exerciseName}: ${p.pattern.map(s => `${s.weight}kg×${s.reps}`).join(" → ")} (${p.confidence} confidence, ${p.sessionCount} sessions)`)
  .join("\n");

prompt += `\n## User's Warm-Up Patterns\n${warmupPatternsText}\n`;
```

---

## 📝 Phase 7: Template System Updates

### 7.1 Update Template Schema

**File**: `src/server/db/schema.ts`

```typescript
export const templates = createTable("template", {
  // ... existing fields ...

  // NEW: Template-level warm-up config (JSON)
  warmupConfig: text("warmup_config"), // JSON: { [exerciseName]: WarmupStrategy }
});

// Example warmupConfig structure:
// {
//   "Bench Press": {
//     "enabled": true,
//     "type": "percentage",
//     "sets": [
//       { "percentage": 40, "reps": 10 },
//       { "percentage": 60, "reps": 6 },
//       { "percentage": 80, "reps": 3 }
//     ]
//   }
// }
```

### 7.2 Add Warm-Up Configuration to Template Form

**File**: `src/app/_components/template-form.tsx`

Add a new step "Warm-Ups" (optional, collapsible):

```tsx
// In exercises step, add warm-up toggle per exercise
{exercises.map((exercise, index) => (
  <div key={index}>
    <ExerciseInput ... />

    {/* Warm-Up Configuration (collapsible) */}
    <details className="mt-2">
      <summary className="cursor-pointer text-sm text-muted-foreground">
        Configure warm-up sets (optional)
      </summary>
      <div className="mt-2 glass-surface glass-hairline rounded-lg p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={exercise.warmupEnabled}
            onChange={(e) => updateExerciseWarmup(index, { enabled: e.target.checked })}
          />
          <span className="text-sm">Include warm-up sets</span>
        </label>

        {exercise.warmupEnabled && (
          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium">Strategy</label>
            <select
              value={exercise.warmupType}
              onChange={(e) => updateExerciseWarmup(index, { type: e.target.value })}
              className="w-full rounded-md border px-2 py-1"
            >
              <option value="percentage">Percentage-based (40% → 60% → 80%)</option>
              <option value="fixed">Fixed weights (20kg → 40kg → 60kg)</option>
              <option value="custom">Custom ladder</option>
            </select>

            {/* Additional config based on strategy */}
          </div>
        )}
      </div>
    </details>
  </div>
))}
```

---

## 🧪 Phase 8: Testing

### 8.1 Unit Tests

**File**: `src/__tests__/unit/warmup-pattern-detection.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { detectWarmupPattern, generateDefaultWarmupProtocol } from "~/server/api/utils/warmup-pattern-detection";

describe("Warm-Up Pattern Detection", () => {
  it("should detect warm-up pattern from history", async () => {
    // Test implementation
  });

  it("should fall back to protocol when insufficient history", async () => {
    // Test implementation
  });

  it("should scale pattern to new working weight", async () => {
    const pattern = await detectWarmupPattern({
      userId: "test-user",
      exerciseName: "Bench Press",
      targetWorkingWeight: 110,
      targetWorkingReps: 5,
    });

    expect(pattern.sets).toHaveLength(3);
    expect(pattern.sets[2].weight).toBeCloseTo(88); // 80% of 110kg
  });
});

describe("Default Warm-Up Protocol", () => {
  it("should generate percentage-based protocol", () => {
    const protocol = generateDefaultWarmupProtocol(100, 5, {
      strategy: "percentage",
      percentages: [40, 60, 80],
      setsCount: 3,
    });

    expect(protocol).toHaveLength(3);
    expect(protocol[0].weight).toBe(40);
    expect(protocol[1].weight).toBe(60);
    expect(protocol[2].weight).toBe(80);
  });
});
```

### 8.2 E2E Tests

**File**: `e2e/workout/warmup-sets.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Warm-Up Sets Feature", () => {
  test("should display warm-up section in active workout", async ({ page }) => {
    // Navigate to active workout
    await page.goto("/workout/session/test-session-id");

    // Verify warm-up section exists
    const warmupSection = page.locator('[aria-label="Warm-up Sets"]');
    await expect(warmupSection).toBeVisible();
  });

  test("should auto-fill warm-up sets", async ({ page }) => {
    await page.goto("/workout/session/test-session-id");

    // Click auto-fill button
    await page.click('button:has-text("Auto Fill")');

    // Verify warm-up sets were populated
    const warmupInputs = page.locator('[aria-label^="Warm-up set"]');
    await expect(warmupInputs).toHaveCount(3);
  });

  test("should allow manual adjustment of warm-up sets", async ({ page }) => {
    await page.goto("/workout/session/test-session-id");

    // Expand warm-up section
    await page.click('button:has-text("Warm-up Sets")');

    // Edit first warm-up set
    const weightInput = page.locator('[aria-label="Warm-up set 1 weight"]');
    await weightInput.fill("45");

    // Verify update
    await expect(weightInput).toHaveValue("45");
  });

  test("should apply smart suggestion", async ({ page }) => {
    await page.goto("/workout/session/test-session-id");

    // Expand warm-up section
    await page.click('button:has-text("Warm-up Sets")');

    // Click "Apply" on suggestion banner
    await page.click('button:has-text("Apply")');

    // Verify sets were applied
    const warmupInputs = page.locator('[aria-label^="Warm-up set"]');
    await expect(warmupInputs.first()).toHaveValue("60");
  });
});
```

---

## 🚀 Phase 9: Deployment Checklist

### Pre-Deployment
- [ ] Run `bun check` (lint + typecheck)
- [ ] Run `bun run test` (all tests pass)
- [ ] Run `bun run test -- src/__tests__/unit/warmup-pattern-detection.test.ts`
- [ ] Run `bun run test:e2e` for warm-up E2E tests
- [ ] Manual QA on mobile viewport
- [ ] Test with real workout data (dogfooding)

### Database Migration
- [ ] Review migration SQL: `drizzle/0014_add_exercise_sets_table.sql`
- [ ] Backup production database
- [ ] Run migration in staging: `infisical run --env staging -- bun db:push`
- [ ] Run backfill script in staging: `infisical run --env staging -- bun scripts/backfill-exercise-sets.ts`
- [ ] Verify data integrity in staging
- [ ] Run migration in production: `infisical run --env production -- bun db:push`
- [ ] Run backfill script in production (monitor closely)

### Feature Rollout
- [ ] Deploy backend changes (tRPC routers, pattern detection)
- [ ] Deploy UI changes (components, preferences)
- [ ] Monitor error logs for migration issues
- [ ] Announce feature to users (in-app banner or email)
- [ ] Collect user feedback

---

## 📈 Success Metrics

### Quantitative
- **Adoption rate**: % of workouts using warm-up sets (target: 60%+)
- **Pattern detection accuracy**: % of suggested warm-ups accepted without edits (target: 70%+)
- **Volume tracking accuracy**: Correct separation of warm-up vs working volume (target: 100%)
- **Performance**: No degradation in workout logging speed (<2s load time)

### Qualitative
- **User feedback**: "Warm-ups feel smart and helpful"
- **Reduced manual work**: Users no longer manually log warm-ups as working sets
- **Playbook quality**: AI-generated playbooks include realistic warm-up protocols

---

## 🔄 Future Enhancements (Phase 10+)

### Exercise Similarity & Pattern Sharing
- Implement ML-based exercise similarity (e.g., barbell bench → dumbbell bench)
- Ask user: "Use your Barbell Bench warm-up for Dumbbell Bench?"
- Build exercise taxonomy (horizontal press, vertical press, squat, hinge, etc.)

### Advanced Analytics
- Track warm-up volume trends over time
- Identify if user is skipping warm-ups (fatigue risk indicator)
- Suggest warm-up modifications based on RPE feedback

### WHOOP Integration
- Send warm-up sets to WHOOP workout sync
- Tag as "warm-up" strain vs "working" strain
- Correlate warm-up strategy with recovery metrics

### Social Features
- Share warm-up protocols with friends
- "Recommended warm-up from [coach/athlete]"
- Community-sourced warm-up strategies by exercise

### Voice-Guided Warm-Ups
- Audio prompts during warm-up sets
- "Next: 60kg for 5 reps. Ready?"
- Haptic feedback when warm-up completes

---

## 📚 Documentation Updates

### Files to Update
- [ ] `README.md` - Add warm-up feature to feature list
- [ ] `AGENTS.md` - Document pattern detection algorithm
- [ ] `docs/workout-tracking.md` - Explain warm-up sets UI
- [ ] `docs/playbooks.md` - Document warm-up prescription format
- [ ] `CHANGELOG.md` - Add entry for v2.1.0 (warm-up sets feature)

---

## 🙋 Questions & Decisions Log

This section tracks decisions made during implementation:

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| 2025-11-18 | Where to store set-level data? | New `exercise_sets` table (Option B) | Better queryability, supports future features (backoff sets, drop sets) |
| 2025-11-18 | How to handle existing data? | Intelligent backfill script | Preserves history, detects patterns retroactively |
| 2025-11-18 | Should warm-ups count toward volume? | Track separately, emphasize working sets | Working volume is the hero metric for progress |
| 2025-11-18 | Template weight storage? | Hybrid (absolute + relative) | User chooses at workout start, flexible |
| 2025-11-18 | Pattern variance handling? | Use most recent pattern | Users evolve, latest preference wins |

---

## 📞 Support & Feedback

- **GitHub Issues**: https://github.com/anthropics/swole-tracker/issues
- **Implementation Questions**: Tag @steven in PR reviews
- **User Feedback**: Collect via in-app feedback form (post-launch)

---

**End of Implementation Plan**

This document is a living guide. Update as implementation progresses and new requirements emerge.
