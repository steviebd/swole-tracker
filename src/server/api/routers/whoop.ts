import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userIntegrations, externalWorkoutsWhoop } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const whoopRouter = createTRPCRouter({
  getIntegrationStatus: protectedProcedure.query(async ({ ctx }) => {
    const [integration] = await ctx.db
      .select({
        isActive: userIntegrations.isActive,
        createdAt: userIntegrations.createdAt,
        scope: userIntegrations.scope,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, ctx.user.id),
          eq(userIntegrations.provider, "whoop")
        )
      );

    return {
      isConnected: !!integration?.isActive,
      connectedAt: integration?.createdAt || null,
      scope: integration?.scope || null,
    };
  }),

  getWorkouts: protectedProcedure.query(async ({ ctx }) => {
    const workouts = await ctx.db
      .select({
        id: externalWorkoutsWhoop.id,
        whoopWorkoutId: externalWorkoutsWhoop.whoopWorkoutId,
        start: externalWorkoutsWhoop.start,
        end: externalWorkoutsWhoop.end,
        sport_name: externalWorkoutsWhoop.sport_name,
        score_state: externalWorkoutsWhoop.score_state,
        score: externalWorkoutsWhoop.score,
        during: externalWorkoutsWhoop.during,
        zone_duration: externalWorkoutsWhoop.zone_duration,
        createdAt: externalWorkoutsWhoop.createdAt,
      })
      .from(externalWorkoutsWhoop)
      .where(eq(externalWorkoutsWhoop.user_id, ctx.user.id))
      .orderBy(desc(externalWorkoutsWhoop.start));

    return workouts;
  }),

  disconnectIntegration: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(userIntegrations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userIntegrations.user_id, ctx.user.id),
          eq(userIntegrations.provider, "whoop")
        )
      );

    return { success: true };
  }),

  getWebhookInfo: protectedProcedure.query(async ({ ctx: _ctx }) => {
    // Get the base URL for the webhook endpoint
    const webhookUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/webhooks/whoop`
      : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/whoop`;

    return {
      webhookUrl,
      isConfigured: !!process.env.WHOOP_WEBHOOK_SECRET,
      supportedEvents: ['workout.updated'],
      instructions: [
        '1. Go to your Whoop Developer Dashboard',
        '2. Navigate to your app settings',
        '3. Add the webhook URL above',
        '4. Select "v2" model version for UUID support',
        '5. Set your app secret as WHOOP_WEBHOOK_SECRET environment variable',
        '6. Save the configuration'
      ]
    };
  }),
});
