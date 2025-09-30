import { and, desc, eq } from "drizzle-orm";

import { env } from "~/env";
import { logger } from "~/lib/logger";
import { buildSessionDebriefPrompt } from "~/lib/ai-prompts/session-debrief";
import { sessionDebriefContentSchema } from "~/server/api/schemas/health-advice-debrief";
import { sessionDebriefs } from "~/server/db/schema";
import { type db } from "~/server/db";
import { gatherSessionDebriefContext } from "~/server/api/utils/session-debrief";

export class AIDebriefRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIDebriefRateLimitError";
  }
}

interface GenerateDebriefOptions {
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

  const payload = await gatherSessionDebriefContext({
    dbClient,
    userId,
    sessionId,
    locale,
    timezone,
  });

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

  const nextDebrief = await dbClient.transaction(async (tx) => {
    const lastVersion = await tx
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
      await tx
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
      metadata,
      isActive: true,
      regenerationCount: existingActive
        ? existingActive.regenerationCount + (trigger === "regenerate" ? 1 : 0)
        : trigger === "regenerate"
          ? 1
          : 0,
    };

    if (existingActive?.id) {
      insertPayload.parentDebriefId = existingActive.id;
    }

    if (Array.isArray(content.prHighlights) && content.prHighlights.length > 0) {
      insertPayload.prHighlights = content.prHighlights;
    }

    if (typeof content.adherenceScore === "number") {
      insertPayload.adherenceScore = content.adherenceScore.toFixed(2);
    }

    if (Array.isArray(content.focusAreas) && content.focusAreas.length > 0) {
      insertPayload.focusAreas = content.focusAreas;
    }

    if (content.streakContext && typeof content.streakContext === "object") {
      insertPayload.streakContext = content.streakContext;
    }

    if (content.overloadDigest && typeof content.overloadDigest === "object") {
      insertPayload.overloadDigest = content.overloadDigest;
    }

    const [inserted] = await tx
      .insert(sessionDebriefs)
      .values(insertPayload)
      .returning();

    return inserted;
  });

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
