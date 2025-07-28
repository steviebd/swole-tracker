import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userPreferences } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const preferencesRouter = createTRPCRouter({
  // Get user preferences
  get: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, ctx.user.id),
    });

    return prefs ?? { defaultWeightUnit: "kg" as const };
  }),

  // Update user preferences
  update: protectedProcedure
    .input(
      z.object({
        defaultWeightUnit: z.enum(["kg", "lbs"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Try to update existing preferences
      const existing = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, ctx.user.id),
      });

      if (existing) {
        await ctx.db
          .update(userPreferences)
          .set({ defaultWeightUnit: input.defaultWeightUnit })
          .where(eq(userPreferences.userId, ctx.user.id));
      } else {
        // Create new preferences if none exist
        await ctx.db.insert(userPreferences).values({
          userId: ctx.user.id,
          defaultWeightUnit: input.defaultWeightUnit,
        });
      }

      return { success: true };
    }),
});
