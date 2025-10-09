import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  sessionDebriefContentSchema,
  sessionDebriefInteractionSchema,
} from "~/server/api/schemas/health-advice-debrief";
import { sessionDebriefs } from "~/server/db/schema";
import {
  generateAndPersistDebrief,
  AIDebriefRateLimitError,
} from "~/server/api/services/session-debrief";
import { logger } from "~/lib/logger";
import { type db } from "~/server/db";

const generateInputSchema = z.object({
  sessionId: z.number().int().positive(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  skipIfActive: z.boolean().optional(),
});

const listInputSchema = z.object({
  sessionId: z.number().int().positive(),
  includeInactive: z.boolean().optional(),
  limit: z.number().int().min(1).max(25).optional(),
});

const feedInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

async function resolveTargetDebrief(
  dbClient: typeof db,
  userId: string,
  sessionId: number,
  debriefId?: number,
) {
  if (debriefId) {
    const match = await dbClient.query.sessionDebriefs.findFirst({
      where: and(
        eq(sessionDebriefs.id, debriefId),
        eq(sessionDebriefs.user_id, userId),
        eq(sessionDebriefs.sessionId, sessionId),
      ),
    });
    if (!match) {
      throw new Error("Debrief not found");
    }
    return match;
  }

  const active = await dbClient.query.sessionDebriefs.findFirst({
    where: and(
      eq(sessionDebriefs.user_id, userId),
      eq(sessionDebriefs.sessionId, sessionId),
      eq(sessionDebriefs.isActive, true),
    ),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.version)],
  });

  if (!active) {
    throw new Error("No active debrief found");
  }
  return active;
}

export const sessionDebriefRouter = createTRPCRouter({
  generateAndSave: protectedProcedure
    .input(generateInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { debrief, content } = await generateAndPersistDebrief({
          dbClient: ctx.db,
          userId: ctx.user.id,
          sessionId: input.sessionId,
          locale: input.locale,
          timezone: input.timezone,
          skipIfActive: input.skipIfActive ?? false,
          trigger: "manual",
          requestId: ctx.requestId,
        });

        return {
          debrief,
          content,
        };
      } catch (error) {
        if (error instanceof AIDebriefRateLimitError) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  regenerate: protectedProcedure
    .input(generateInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { debrief, content } = await generateAndPersistDebrief({
          dbClient: ctx.db,
          userId: ctx.user.id,
          sessionId: input.sessionId,
          locale: input.locale,
          timezone: input.timezone,
          skipIfActive: false,
          trigger: "regenerate",
          requestId: ctx.requestId,
        });

        return {
          debrief,
          content,
        };
      } catch (error) {
        if (error instanceof AIDebriefRateLimitError) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  listBySession: protectedProcedure
    .input(listInputSchema)
    .query(async ({ ctx, input }) => {
      const predicates = [
        eq(sessionDebriefs.user_id, ctx.user.id),
        eq(sessionDebriefs.sessionId, input.sessionId),
      ];
      if (!input.includeInactive) {
        predicates.push(isNull(sessionDebriefs.dismissedAt));
      }

      const results = await ctx.db.query.sessionDebriefs.findMany({
        where: and(...predicates),
        orderBy: (table, { desc: orderDesc }) => [
          orderDesc(table.isActive),
          orderDesc(table.version),
        ],
        limit: input.limit ?? 10,
        with: {
          session: {
            columns: {
              workoutDate: true,
            },
            with: {
              template: {
                columns: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return results;
    }),

  listRecent: protectedProcedure
    .input(feedInputSchema)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.sessionDebriefs.findMany({
        where: and(
          eq(sessionDebriefs.user_id, ctx.user.id),
          isNull(sessionDebriefs.dismissedAt),
        ),
        orderBy: (table, { desc: orderDesc }) => [
          orderDesc(table.isActive),
          orderDesc(table.createdAt),
        ],
        limit: input.limit,
        with: {
          session: {
            columns: {
              workoutDate: true,
              id: true,
            },
            with: {
              template: {
                columns: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return results;
    }),

  markViewed: protectedProcedure
    .input(sessionDebriefInteractionSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await resolveTargetDebrief(
        ctx.db,
        ctx.user.id,
        input.sessionId,
        input.debriefId,
      );

      const [updated] = await ctx.db
        .update(sessionDebriefs)
        .set({ viewedAt: new Date() })
        .where(eq(sessionDebriefs.id, target.id))
        .returning();

      logger.info("session_debrief.viewed", {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        debriefId: target.id,
        requestId: ctx.requestId,
      });

      return updated;
    }),

  togglePinned: protectedProcedure
    .input(sessionDebriefInteractionSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await resolveTargetDebrief(
        ctx.db,
        ctx.user.id,
        input.sessionId,
        input.debriefId,
      );

      const now = new Date();
      const isPinned = Boolean(target.pinnedAt);
      const [updated] = await ctx.db
        .update(sessionDebriefs)
        .set({ pinnedAt: isPinned ? null : now })
        .where(eq(sessionDebriefs.id, target.id))
        .returning();

      logger.info("session_debrief.toggle_pin", {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        debriefId: target.id,
        pinned: !isPinned,
        requestId: ctx.requestId,
      });

      return updated;
    }),

  dismiss: protectedProcedure
    .input(sessionDebriefInteractionSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await resolveTargetDebrief(
        ctx.db,
        ctx.user.id,
        input.sessionId,
        input.debriefId,
      );

      const [updated] = await ctx.db
        .update(sessionDebriefs)
        .set({
          dismissedAt: new Date(),
          isActive: false,
        })
        .where(eq(sessionDebriefs.id, target.id))
        .returning();

      logger.info("session_debrief.dismissed", {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        debriefId: target.id,
        requestId: ctx.requestId,
      });

      return updated;
    }),

  updateMetadata: protectedProcedure
    .input(
      sessionDebriefInteractionSchema.extend({
        metadata: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await resolveTargetDebrief(
        ctx.db,
        ctx.user.id,
        input.sessionId,
        input.debriefId,
      );

      const parsed = sessionDebriefContentSchema.shape.metadata.parse(
        input.metadata,
      );

      const [updated] = await ctx.db
        .update(sessionDebriefs)
        .set({ metadata: JSON.stringify(parsed) })
        .where(eq(sessionDebriefs.id, target.id))
        .returning();

      logger.info("session_debrief.metadata_updated", {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        debriefId: target.id,
        requestId: ctx.requestId,
      });

      return updated;
    }),
});
