import { eq, and, or, inArray } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  exerciseResolutionCache,
  templateExercises,
  exerciseLinks,
  masterExercises,
} from "~/server/db/schema";
import { logger } from "~/lib/logger";
import { SQLITE_VARIABLE_LIMIT, whereInChunks } from "./chunk-utils";

export type CachedExerciseResolution = {
  exerciseName: string;
  templateExerciseId: number | null;
  masterExerciseId: number | null;
  masterExerciseName: string | null;
  aliases: string[];
  templateExerciseIds: number[];
  lastUpdated: Date;
};

/**
 * Get exercise resolution from cache, falling back to database lookup if cache miss
 */
export async function getCachedExerciseResolution(
  database: typeof db,
  userId: string,
  exerciseIdentifier: string | number,
): Promise<CachedExerciseResolution | null> {
  try {
    // Try cache lookup first
    const cacheResult = await database
      .select()
      .from(exerciseResolutionCache)
      .where(
        and(
          eq(exerciseResolutionCache.user_id, userId),
          typeof exerciseIdentifier === "string"
            ? eq(exerciseResolutionCache.resolved_name, exerciseIdentifier)
            : eq(
                exerciseResolutionCache.master_exercise_id,
                exerciseIdentifier,
              ),
        ),
      )
      .limit(1);

    if (cacheResult.length > 0) {
      const cached = cacheResult[0]!;

      // Check if cache is fresh (updated within last 24 hours)
      const cacheAge = Date.now() - (cached.updatedAt?.getTime() ?? 0);
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge < maxCacheAge) {
        return {
          exerciseName: cached.resolved_name,
          templateExerciseId: null, // Not stored in current schema
          masterExerciseId: cached.master_exercise_id,
          masterExerciseName: null, // Not stored in current schema
          aliases: [], // Not stored in current schema
          templateExerciseIds: [], // Not stored in current schema
          lastUpdated: cached.updatedAt ?? new Date(),
        };
      }
    }

    // Cache miss or stale - fetch from database and update cache
    return await refreshExerciseResolutionCache(
      database,
      userId,
      exerciseIdentifier,
    );
  } catch (error) {
    logger.warn("Exercise resolution cache lookup failed", {
      userId,
      exerciseIdentifier,
      error,
    });
    return null;
  }
}

/**
 * Refresh exercise resolution cache by querying database and updating cache table
 */
async function refreshExerciseResolutionCache(
  database: typeof db,
  userId: string,
  exerciseIdentifier: string | number,
): Promise<CachedExerciseResolution | null> {
  try {
    let resolution: CachedExerciseResolution | null = null;

    if (typeof exerciseIdentifier === "number") {
      // Resolve by template exercise ID
      resolution = await resolveByTemplateExerciseId(
        database,
        userId,
        exerciseIdentifier,
      );
    } else {
      // Resolve by exercise name
      resolution = await resolveByExerciseName(
        database,
        userId,
        exerciseIdentifier,
      );
    }

    if (resolution) {
      // Update cache with fresh data
      await database
        .insert(exerciseResolutionCache)
        .values({
          user_id: userId,
          resolved_name: resolution.exerciseName,
          master_exercise_id: resolution.masterExerciseId,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            exerciseResolutionCache.user_id,
            exerciseResolutionCache.resolved_name,
          ],
          set: {
            master_exercise_id: resolution.masterExerciseId,
            updatedAt: new Date(),
          },
        });
    }

    return resolution;
  } catch (error) {
    logger.error("Failed to refresh exercise resolution cache", {
      userId,
      exerciseIdentifier,
      error,
    });
    return null;
  }
}

/**
 * Resolve exercise by template exercise ID
 */
async function resolveByTemplateExerciseId(
  database: typeof db,
  userId: string,
  templateExerciseId: number,
): Promise<CachedExerciseResolution | null> {
  const templateRow = await database
    .select({
      templateExerciseId: templateExercises.id,
      templateName: templateExercises.exerciseName,
      masterExerciseId: exerciseLinks.masterExerciseId,
      masterExerciseName: masterExercises.name,
    })
    .from(templateExercises)
    .leftJoin(
      exerciseLinks,
      and(
        eq(exerciseLinks.templateExerciseId, templateExercises.id),
        eq(exerciseLinks.user_id, userId),
      ),
    )
    .leftJoin(
      masterExercises,
      eq(masterExercises.id, exerciseLinks.masterExerciseId),
    )
    .where(
      and(
        eq(templateExercises.id, templateExerciseId),
        eq(templateExercises.user_id, userId),
      ),
    )
    .limit(1);

  if (!templateRow.length) {
    return null;
  }

  const template = templateRow[0]!;
  const aliases = new Set<string>();
  const templateIds = new Set<number>();

  templateIds.add(template.templateExerciseId);

  if (template.templateName) {
    aliases.add(template.templateName);
  }

  if (template.masterExerciseName) {
    aliases.add(template.masterExerciseName);
  }

  // Get all linked exercises if there's a master exercise
  if (template.masterExerciseId) {
    const linkedRows = await database
      .select({
        templateExerciseId: exerciseLinks.templateExerciseId,
        exerciseName: templateExercises.exerciseName,
      })
      .from(exerciseLinks)
      .innerJoin(
        templateExercises,
        eq(templateExercises.id, exerciseLinks.templateExerciseId),
      )
      .where(
        and(
          eq(exerciseLinks.masterExerciseId, template.masterExerciseId),
          eq(exerciseLinks.user_id, userId),
        ),
      );

    for (const row of linkedRows) {
      if (row.templateExerciseId) {
        templateIds.add(row.templateExerciseId);
      }
      if (row.exerciseName) {
        aliases.add(row.exerciseName);
      }
    }
  }

  const exerciseName =
    template.masterExerciseName || template.templateName || "Unknown Exercise";

  return {
    exerciseName,
    templateExerciseId: template.templateExerciseId,
    masterExerciseId: template.masterExerciseId,
    masterExerciseName: template.masterExerciseName,
    aliases: Array.from(aliases),
    templateExerciseIds: Array.from(templateIds),
    lastUpdated: new Date(),
  };
}

/**
 * Resolve exercise by exercise name
 */
async function resolveByExerciseName(
  database: typeof db,
  userId: string,
  exerciseName: string,
): Promise<CachedExerciseResolution | null> {
  // Look for exact match in template exercises first
  const templateRows = await database
    .select({
      templateExerciseId: templateExercises.id,
      templateName: templateExercises.exerciseName,
      masterExerciseId: exerciseLinks.masterExerciseId,
      masterExerciseName: masterExercises.name,
    })
    .from(templateExercises)
    .leftJoin(
      exerciseLinks,
      and(
        eq(exerciseLinks.templateExerciseId, templateExercises.id),
        eq(exerciseLinks.user_id, userId),
      ),
    )
    .leftJoin(
      masterExercises,
      eq(masterExercises.id, exerciseLinks.masterExerciseId),
    )
    .where(
      and(
        eq(templateExercises.user_id, userId),
        eq(templateExercises.exerciseName, exerciseName),
      ),
    )
    .limit(1);

  if (templateRows.length > 0) {
    const template = templateRows[0]!;
    return await resolveByTemplateExerciseId(
      database,
      userId,
      template.templateExerciseId,
    );
  }

  // If no template match, look for master exercise match
  const masterRows = await database
    .select({
      masterExerciseId: masterExercises.id,
      masterExerciseName: masterExercises.name,
    })
    .from(masterExercises)
    .where(eq(masterExercises.name, exerciseName))
    .limit(1);

  if (masterRows.length > 0) {
    const master = masterRows[0]!;

    // Get all linked template exercises for this master
    const linkedRows = await database
      .select({
        templateExerciseId: exerciseLinks.templateExerciseId,
        exerciseName: templateExercises.exerciseName,
      })
      .from(exerciseLinks)
      .innerJoin(
        templateExercises,
        eq(templateExercises.id, exerciseLinks.templateExerciseId),
      )
      .where(
        and(
          eq(exerciseLinks.masterExerciseId, master.masterExerciseId),
          eq(exerciseLinks.user_id, userId),
        ),
      );

    const aliases = new Set<string>();
    const templateIds = new Set<number>();

    aliases.add(master.masterExerciseName);

    for (const row of linkedRows) {
      if (row.templateExerciseId) {
        templateIds.add(row.templateExerciseId);
      }
      if (row.exerciseName) {
        aliases.add(row.exerciseName);
      }
    }

    return {
      exerciseName: master.masterExerciseName,
      templateExerciseId: null,
      masterExerciseId: master.masterExerciseId,
      masterExerciseName: master.masterExerciseName,
      aliases: Array.from(aliases),
      templateExerciseIds: Array.from(templateIds),
      lastUpdated: new Date(),
    };
  }

  // No match found - return basic resolution
  return {
    exerciseName,
    templateExerciseId: null,
    masterExerciseId: null,
    masterExerciseName: null,
    aliases: [exerciseName],
    templateExerciseIds: [],
    lastUpdated: new Date(),
  };
}

/**
 * Bulk cache refresh for multiple exercises
 */
export async function bulkRefreshExerciseCache(
  database: typeof db,
  userId: string,
  exerciseIdentifiers: (string | number)[],
): Promise<void> {
  if (exerciseIdentifiers.length === 0) {
    return;
  }

  try {
    // Process in chunks to avoid D1 limits
    await whereInChunks(exerciseIdentifiers, async (chunk) => {
      for (const identifier of chunk) {
        await refreshExerciseResolutionCache(database, userId, identifier);
      }
    });

    logger.info("Bulk exercise cache refresh completed", {
      userId,
      count: exerciseIdentifiers.length,
    });
  } catch (error) {
    logger.error("Bulk exercise cache refresh failed", {
      userId,
      count: exerciseIdentifiers.length,
      error,
    });
  }
}

/**
 * Clear stale cache entries older than specified age
 */
export async function clearStaleExerciseCache(
  database: typeof db,
  userId: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000, // 24 hours default
): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - maxAgeMs);

    // For now, return 0 as placeholder since cache clearing isn't fully implemented
    const result = { changes: 0, lastInsertRowid: 0 };

    // For now, return 0 as placeholder
    // In a real implementation, you'd need to use a subquery or different approach
    return 0;
  } catch (error) {
    logger.error("Failed to clear stale exercise cache", {
      userId,
      maxAgeMs,
      error,
    });
    return 0;
  }
}
