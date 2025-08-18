import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { webhookEvents } from "~/server/db/schema-d1";
import { desc, eq } from "drizzle-orm";

export const webhooksRouter = createTRPCRouter({
  getRecentEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        provider: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query = ctx.db
        .select()
        .from(webhookEvents)
        .orderBy(desc(webhookEvents.createdAt))
        .limit(input.limit);

      if (input.provider) {
        query.where(eq(webhookEvents.provider, input.provider));
      }

      return await query;
    }),

  getEventById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [event] = await ctx.db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.id, input.id));

      return event;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    // This is a simple stats query - in production you might want to optimize this
    const events = await ctx.db
      .select({
        status: webhookEvents.status,
        provider: webhookEvents.provider,
        eventType: webhookEvents.eventType,
        createdAt: webhookEvents.createdAt,
      })
      .from(webhookEvents);

    const stats = {
      total: events.length,
      byStatus: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      byEventType: {} as Record<string, number>,
      recentActivity: events.slice(0, 10),
    };

    events.forEach((event) => {
      stats.byStatus[event.status] = (stats.byStatus[event.status] ?? 0) + 1;
      stats.byProvider[event.provider] =
        (stats.byProvider[event.provider] ?? 0) + 1;
      stats.byEventType[event.eventType] =
        (stats.byEventType[event.eventType] ?? 0) + 1;
    });

    return stats;
  }),
});
