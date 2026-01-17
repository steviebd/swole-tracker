import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sessionDebriefs, workoutSessions } from "~/server/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { withAuth } from "./middleware";

// === GENERATE SESSION DEBRIEF ===
export const generateDebrief = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number().int().positive(),
      locale: z.string().optional(),
      timezone: z.string().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, locale, timezone } = data!;

    const session = await db.query.workoutSessions.findFirst({
      where: and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.user_id, user.id),
      ),
      with: { exercises: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const exerciseCount = session.exercises?.length ?? 0;
    const totalVolume =
      session.exercises?.reduce((sum, ex) => sum + (ex.volume_load ?? 0), 0) ??
      0;

    const summary = `Great workout! You completed ${exerciseCount} exercises with a total volume of ${Math.round(totalVolume)}kg.`;
    const prHighlights = JSON.stringify([
      "Consistent effort throughout the session",
      "Good exercise variety",
      "Maintained steady tempo",
    ]);
    const focusAreas = JSON.stringify([
      "Consider adding more progressive overload next session",
      "Focus on mind-muscle connection",
      "Ensure adequate rest between sets",
    ]);

    const [debrief] = await db
      .insert(sessionDebriefs)
      .values({
        user_id: user.id,
        sessionId,
        summary,
        prHighlights,
        focusAreas,
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      debrief,
      content: {
        summary,
        highlights: JSON.parse(prHighlights),
        suggestions: JSON.parse(focusAreas),
      },
    };
  });

// === GET DEBRIEF BY SESSION ID ===
export const getDebriefBySessionId = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      sessionId: z.number().int().positive(),
      includeInactive: z.boolean().default(false),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, includeInactive } = data!;

    const predicates = [
      eq(sessionDebriefs.user_id, user.id),
      eq(sessionDebriefs.sessionId, sessionId),
    ];

    if (!includeInactive) {
      predicates.push(isNull(sessionDebriefs.dismissedAt));
    }

    const results = await db
      .select()
      .from(sessionDebriefs)
      .where(and(...predicates))
      .orderBy(desc(sessionDebriefs.version))
      .limit(10);

    return results.map((debrief) => ({
      ...debrief,
      highlights: debrief.prHighlights
        ? JSON.parse(debrief.prHighlights)
        : null,
      suggestions: debrief.focusAreas ? JSON.parse(debrief.focusAreas) : null,
    }));
  });
