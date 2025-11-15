import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { env } from "~/env";
import { logger } from "~/lib/logger";
import { buildSessionDebriefPrompt } from "~/lib/ai-prompts/session-debrief";
import {
  sessionDebriefContentSchema,
  type SessionDebriefContent,
} from "~/server/api/schemas/health-advice-debrief";
import { sessionDebriefs } from "~/server/db/schema";
import { type db } from "~/server/db";
import {
  gatherSessionDebriefContext,
  type GatherContextArgs,
} from "~/server/api/utils/session-debrief";
import { chunkedBatch } from "~/server/db/chunk-utils";
import type { SQLiteTransaction } from "drizzle-orm/sqlite-core";

export class AIDebriefRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIDebriefRateLimitError";
  }
}

type SessionDebriefRow = typeof sessionDebriefs.$inferSelect;

const isBeginTransactionError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("failed query: begin") ||
    message.includes("cannot start a transaction within a transaction")
  );
};

const persistDebriefRecord = async ({
  dbClient,
  userId,
  sessionId,
  trigger,
  content,
  existingActive,
}: {
  dbClient: typeof db | SQLiteTransaction<"async", any, any, any>;
  userId: string;
  sessionId: number;
  trigger: "auto" | "manual" | "regenerate";
  content: SessionDebriefContent;
  existingActive: SessionDebriefRow | undefined;
}) => {
  const lastVersion = await dbClient
    .select({ version: sessionDebriefs.version })
    .from(sessionDebriefs)
    .where(
      and(
        eq(sessionDebriefs.user_id, userId),
        eq(sessionDebriefs.sessionId, sessionId),
      ),
    )
    .orderBy(desc(sessionDebriefs.version))
    .limit(1);

  const nextVersion = (lastVersion[0]?.version ?? 0) + 1;

  if (existingActive) {
    await dbClient
      .update(sessionDebriefs)
      .set({ isActive: false })
      .where(eq(sessionDebriefs.id, existingActive.id));
  }

  const metadata = {
    ...(content.metadata ?? {}),
    generatedAt: new Date().toISOString(),
    trigger,
  } satisfies Record<string, unknown>;

  const insertPayload: typeof sessionDebriefs.$inferInsert = {
    user_id: userId,
    sessionId,
    version: nextVersion,
    summary: content.summary,
    isActive: true,
    regenerationCount:
      (existingActive?.regenerationCount ?? 0) +
      (trigger === "regenerate" ? 1 : 0),
    metadata: JSON.stringify(metadata),
  };

  if (existingActive?.id) {
    insertPayload.parentDebriefId = existingActive.id;
  }

  if (Array.isArray(content.prHighlights) && content.prHighlights.length > 0) {
    insertPayload.prHighlights = JSON.stringify(content.prHighlights);
  }

  if (typeof content.adherenceScore === "number") {
    insertPayload.adherenceScore = content.adherenceScore;
  }

  if (Array.isArray(content.focusAreas) && content.focusAreas.length > 0) {
    insertPayload.focusAreas = JSON.stringify(content.focusAreas);
  }

  if (content.streakContext && typeof content.streakContext === "object") {
    insertPayload.streakContext = JSON.stringify(content.streakContext);
  }

  if (content.overloadDigest && typeof content.overloadDigest === "object") {
    insertPayload.overloadDigest = JSON.stringify(content.overloadDigest);
  }

  const [inserted] = await dbClient
    .insert(sessionDebriefs)
    .values(insertPayload)
    .returning();

  return inserted;
};

const bulkPersistDebriefRecords = async ({
  dbClient,
  userId,
  debriefRecords,
}: {
  dbClient: typeof db | SQLiteTransaction<"async", any, any, any>;
  userId: string;
  debriefRecords: Array<{
    sessionId: number;
    trigger: "auto" | "manual" | "regenerate";
    content: SessionDebriefContent;
    existingActive: SessionDebriefRow | undefined;
  }>;
}) => {
  const results: SessionDebriefRow[] = [];

  // Process each debrief record to get version numbers and build payloads
  const payloads: Array<typeof sessionDebriefs.$inferInsert> = [];

  // 1. Batch fetch all versions before loop
  const sessionIds = [...new Set(debriefRecords.map((r) => r.sessionId))];
  const latestVersionsResult = await dbClient
    .select({
      sessionId: sessionDebriefs.sessionId,
      version: sql<number>`MAX(${sessionDebriefs.version})`.as("version"),
    })
    .from(sessionDebriefs)
    .where(
      and(
        eq(sessionDebriefs.user_id, userId),
        inArray(sessionDebriefs.sessionId, sessionIds),
      ),
    )
    .groupBy(sessionDebriefs.sessionId);

  // 2. Create version lookup map
  const versionMap = new Map(
    latestVersionsResult.map((v) => [v.sessionId, v.version as number]),
  );

  // 3. Collect IDs to deactivate
  const idsToDeactivate: number[] = [];

  for (const record of debriefRecords) {
    const { sessionId, trigger, content, existingActive } = record;

    const lastVersion = versionMap.get(sessionId) ?? 0;
    const nextVersion = lastVersion + 1;

    // Collect existing active IDs for batch deactivation
    if (existingActive) {
      idsToDeactivate.push(existingActive.id);
    }

    const metadata = {
      ...(content.metadata ?? {}),
      generatedAt: new Date().toISOString(),
      trigger,
    } satisfies Record<string, unknown>;

    const insertPayload: typeof sessionDebriefs.$inferInsert = {
      user_id: userId,
      sessionId,
      version: nextVersion,
      summary: content.summary,
      isActive: true,
      regenerationCount:
        (existingActive?.regenerationCount ?? 0) +
        (trigger === "regenerate" ? 1 : 0),
      metadata: JSON.stringify(metadata),
    };

    if (existingActive?.id) {
      insertPayload.parentDebriefId = existingActive.id;
    }

    if (
      Array.isArray(content.prHighlights) &&
      content.prHighlights.length > 0
    ) {
      insertPayload.prHighlights = JSON.stringify(content.prHighlights);
    }

    if (typeof content.adherenceScore === "number") {
      insertPayload.adherenceScore = content.adherenceScore;
    }

    if (Array.isArray(content.focusAreas) && content.focusAreas.length > 0) {
      insertPayload.focusAreas = JSON.stringify(content.focusAreas);
    }

    if (content.streakContext && typeof content.streakContext === "object") {
      insertPayload.streakContext = JSON.stringify(content.streakContext);
    }

    if (content.overloadDigest && typeof content.overloadDigest === "object") {
      insertPayload.overloadDigest = JSON.stringify(content.overloadDigest);
    }

    payloads.push(insertPayload);
  }

  // 4. Bulk deactivate in single query
  if (idsToDeactivate.length > 0) {
    await dbClient
      .update(sessionDebriefs)
      .set({ isActive: false })
      .where(inArray(sessionDebriefs.id, idsToDeactivate));
  }

  // Use chunked batch for large datasets
  if (payloads.length > 5) {
    logger.info(
      `Using chunked batch insert for ${payloads.length} session debrief records`,
    );
    await chunkedBatch(
      dbClient,
      payloads,
      (chunk) => dbClient.insert(sessionDebriefs).values(chunk).returning(),
      { limit: 90, maxStatementsPerBatch: 3 },
    );
  } else {
    // For smaller batches, use regular insert
    const inserted = await dbClient
      .insert(sessionDebriefs)
      .values(payloads)
      .returning();
    results.push(...inserted);
  }

  return results;
};

export interface GenerateDebriefOptions {
  dbClient: typeof db;
  userId: string;
  sessionId: number;
  locale?: string;
  timezone?: string;
  skipIfActive?: boolean;
  trigger?: "auto" | "manual" | "regenerate";
  requestId?: string;
}

export async function generateAndPersistDebrief({
  dbClient,
  userId,
  sessionId,
  locale,
  timezone,
  skipIfActive = false,
  trigger = "auto",
  requestId,
}: GenerateDebriefOptions) {
  const existingActive = await dbClient.query.sessionDebriefs.findFirst({
    where: and(
      eq(sessionDebriefs.user_id, userId),
      eq(sessionDebriefs.sessionId, sessionId),
      eq(sessionDebriefs.isActive, true),
    ),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.version)],
  });

  if (skipIfActive && existingActive) {
    logger.info("session_debrief.skip_generate", {
      userId,
      sessionId,
      reason: "active_exists",
      requestId,
    });
    return { debrief: existingActive, content: null } as const;
  }

  const contextArgs: GatherContextArgs = {
    dbClient,
    userId,
    sessionId,
    ...(locale !== undefined && { locale }),
    ...(timezone !== undefined && { timezone }),
  };

  const payload = await gatherSessionDebriefContext(contextArgs);

  const { system, prompt } = buildSessionDebriefPrompt(payload);

  const modelId = env.AI_DEBRIEF_MODEL || env.AI_GATEWAY_MODEL_HEALTH;
  if (!modelId) {
    throw new Error("AI model for debrief generation is not configured");
  }

  const temperature = Number(env.AI_DEBRIEF_TEMPERATURE ?? 0.7);

  const { generateText } = await import("ai");

  let aiRaw = "";
  try {
    const result = await generateText({
      model: modelId,
      system,
      prompt,
      temperature,
    });
    aiRaw = result.text;
  } catch (error) {
    const err = error as Error & { status?: number };
    const isRateLimited =
      err?.name === "GatewayRateLimitError" ||
      err?.message?.toLowerCase().includes("free credits") ||
      err?.message?.includes("rate limit") ||
      err?.status === 429;

    logger.error("session_debrief.ai_call_failed", err, {
      userId,
      sessionId,
      modelId,
      requestId,
    });

    if (isRateLimited) {
      throw new AIDebriefRateLimitError(
        "AI generation is temporarily rate limited. Please try again soon.",
      );
    }

    throw err;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(aiRaw);
  } catch (error) {
    logger.error("session_debrief.invalid_json", error, {
      userId,
      sessionId,
      snippet: aiRaw.slice(0, 200),
      requestId,
    });
    throw new Error("AI response was not valid JSON");
  }

  const content = sessionDebriefContentSchema.parse(parsedJson);

  let nextDebrief: SessionDebriefRow | undefined;

  try {
    nextDebrief = await dbClient.transaction((tx) =>
      persistDebriefRecord({
        dbClient: tx,
        userId,
        sessionId,
        trigger,
        content,
        existingActive,
      }),
    );
  } catch (error) {
    if (!isBeginTransactionError(error)) {
      throw error;
    }

    logger.warn("session_debrief.transaction_fallback", {
      userId,
      sessionId,
      requestId,
      error: error instanceof Error ? error.message : error,
    });

    nextDebrief = await persistDebriefRecord({
      dbClient,
      userId,
      sessionId,
      trigger,
      content,
      existingActive,
    });
  }

  if (!nextDebrief) {
    throw new Error("Failed to persist session debrief");
  }

  logger.info("session_debrief.generated", {
    userId,
    sessionId,
    debriefId: nextDebrief.id,
    version: nextDebrief.version,
    trigger,
    requestId,
  });

  return { debrief: nextDebrief, content, context: payload.context } as const;
}

export interface BulkGenerateDebriefOptions {
  dbClient: typeof db;
  userId: string;
  sessionIds: number[];
  locale?: string;
  timezone?: string;
  skipIfActive?: boolean;
  trigger?: "auto" | "manual" | "regenerate";
  requestId?: string;
}

export async function bulkGenerateAndPersistDebriefs({
  dbClient,
  userId,
  sessionIds,
  locale,
  timezone,
  skipIfActive = false,
  trigger = "auto",
  requestId,
}: BulkGenerateDebriefOptions) {
  if (sessionIds.length === 0) {
    return { debriefs: [], errors: [] };
  }

  const results: Array<{
    debrief: SessionDebriefRow;
    content: SessionDebriefContent;
  }> = [];
  const errors: Array<{ sessionId: number; error: string }> = [];

  // Gather context for all sessions first
  const sessionContexts = await Promise.allSettled(
    sessionIds.map(async (sessionId) => {
      try {
        const contextArgs: GatherContextArgs = {
          dbClient,
          userId,
          sessionId,
          ...(locale !== undefined && { locale }),
          ...(timezone !== undefined && { timezone }),
        };

        const payload = await gatherSessionDebriefContext(contextArgs);
        return { sessionId, payload };
      } catch (error) {
        throw new Error(
          `Failed to gather context for session ${sessionId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
  );

  const validContexts = sessionContexts
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        sessionId: number;
        payload: any;
      }> => result.status === "fulfilled",
    )
    .map((result) => result.value);

  const failedContexts: Array<{ sessionId: number; error: string }> = [];
  sessionContexts.forEach((result, index) => {
    if (result.status === "rejected") {
      const sessionId = sessionIds[index];
      if (sessionId !== undefined) {
        failedContexts.push({ sessionId, error: result.reason.message });
      }
    }
  });

  errors.push(...failedContexts);

  if (validContexts.length === 0) {
    return { debriefs: [], errors };
  }

  // Check for existing active debriefs
  const existingActiveMap = new Map<number, SessionDebriefRow>();
  for (const { sessionId } of validContexts) {
    const existingActive = await dbClient.query.sessionDebriefs.findFirst({
      where: and(
        eq(sessionDebriefs.user_id, userId),
        eq(sessionDebriefs.sessionId, sessionId),
        eq(sessionDebriefs.isActive, true),
      ),
      orderBy: (table, { desc: orderDesc }) => [orderDesc(table.version)],
    });

    if (existingActive) {
      existingActiveMap.set(sessionId, existingActive);
      if (skipIfActive) {
        logger.info("session_debrief.bulk_skip_generate", {
          userId,
          sessionId,
          reason: "active_exists",
          requestId,
        });
        continue;
      }
    }
  }

  // Generate AI content for each valid session
  const modelId = env.AI_DEBRIEF_MODEL || env.AI_GATEWAY_MODEL_HEALTH;
  if (!modelId) {
    throw new Error("AI model for debrief generation is not configured");
  }

  const temperature = Number(env.AI_DEBRIEF_TEMPERATURE ?? 0.7);
  const { generateText } = await import("ai");

  const debriefRecords: Array<{
    sessionId: number;
    trigger: "auto" | "manual" | "regenerate";
    content: SessionDebriefContent;
    existingActive: SessionDebriefRow | undefined;
  }> = [];

  for (const { sessionId, payload } of validContexts) {
    if (skipIfActive && existingActiveMap.has(sessionId)) {
      continue;
    }

    const { system, prompt } = buildSessionDebriefPrompt(payload);

    try {
      const result = await generateText({
        model: modelId,
        system,
        prompt,
        temperature,
      });

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(result.text);
      } catch (error) {
        throw new Error("AI response was not valid JSON");
      }

      const content = sessionDebriefContentSchema.parse(parsedJson);
      const existingActive = existingActiveMap.get(sessionId);

      debriefRecords.push({
        sessionId,
        trigger,
        content,
        existingActive,
      });
    } catch (error) {
      errors.push({
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Bulk persist all debrief records
  let insertedDebriefs: SessionDebriefRow[] = [];
  if (debriefRecords.length > 0) {
    try {
      insertedDebriefs = await bulkPersistDebriefRecords({
        dbClient,
        userId,
        debriefRecords,
      });
    } catch (error) {
      // Fallback to individual inserts if bulk fails
      logger.warn("session_debrief.bulk_fallback_to_individual", {
        userId,
        recordCount: debriefRecords.length,
        error: error instanceof Error ? error.message : error,
      });

      for (const record of debriefRecords) {
        try {
          const debrief = await persistDebriefRecord({
            dbClient,
            userId,
            sessionId: record.sessionId,
            trigger: record.trigger,
            content: record.content,
            existingActive: record.existingActive,
          });
          if (debrief) {
            insertedDebriefs.push(debrief);
          }
        } catch (individualError) {
          errors.push({
            sessionId: record.sessionId,
            error:
              individualError instanceof Error
                ? individualError.message
                : "Unknown error",
          });
        }
      }
    }
  }

  logger.info("session_debrief.bulk_generated", {
    userId,
    totalSessions: sessionIds.length,
    successfulDebriefs: insertedDebriefs.length,
    errors: errors.length,
    requestId,
  });

  return {
    debriefs: insertedDebriefs.map((debrief) => {
      const content = debriefRecords.find(
        (r) => r.sessionId === debrief.sessionId,
      )?.content;
      if (!content) {
        throw new Error(
          `Content not found for debrief session ${debrief.sessionId}`,
        );
      }
      return { debrief, content };
    }),
    errors,
  };
}
