import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userPreferences } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { unitPreferenceSchema } from "~/server/api/schemas/common";

export const preferencesRouter = createTRPCRouter({
  // Get user preferences
  get: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.user_id, ctx.user.id),
    });

    return prefs ?? { defaultWeightUnit: "kg" as const };
  }),

  // Update user preferences
  update: protectedProcedure
    .input(
      // Centralized schema usage
      // Map external field to internal enum for consistency
      // Keeping API shape as { defaultWeightUnit: "kg" | "lbs" }
      unitPreferenceSchema.transform((unit) => ({ defaultWeightUnit: unit }))
    )
    .mutation(async ({ input, ctx }) => {
      // Try to update existing preferences
      const existing = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.user_id, ctx.user.id),
      });

      if (existing) {
        await ctx.db
          .update(userPreferences)
          .set({ defaultWeightUnit: input.defaultWeightUnit })
          .where(eq(userPreferences.user_id, ctx.user.id));
      } else {
        // Create new preferences if none exist
        await ctx.db.insert(userPreferences).values({
          user_id: ctx.user.id,
          defaultWeightUnit: input.defaultWeightUnit,
        });
      }

      return { success: true };
    }),
});
