import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userPreferences } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { unitPreferenceSchema } from "~/server/api/schemas/common";
import { z } from "zod";

export const preferencesRouter = createTRPCRouter({
  // Get user preferences
  get: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.user_id, ctx.user.id),
    });

    // Provide API-safe defaults when row doesn't exist
    return (
      prefs ?? {
        defaultWeightUnit: "kg" as const,
        predictive_defaults_enabled: false,
        right_swipe_action: "collapse_expand",
        // New: default 1RM coefficient (Epley factor). Default = 1/30 ≈ 0.0333
        estimated_one_rm_factor: 1 / 30,
      }
    );
  }),

  // Update user preferences
  update: protectedProcedure
    .input(
      z
        .object({
          // maintain compatibility with existing client usage
          defaultWeightUnit: unitPreferenceSchema.optional(),
          predictive_defaults_enabled: z.boolean().optional(),
          right_swipe_action: z.enum(["collapse_expand", "none"]).optional(),
          // New: estimated 1RM factor preference (coefficient used in estimate: weight * (1 + reps * factor))
          // Default remains 1/30 when not set. Accepts conservative bounds.
          estimated_one_rm_factor: z.number().min(0.02).max(0.05).optional(),
        })
        // Normalize shape so we always upsert known keys with defaults when undefined
        .transform((input) => ({
          defaultWeightUnit: input.defaultWeightUnit,
          predictive_defaults_enabled: input.predictive_defaults_enabled,
          right_swipe_action: input.right_swipe_action,
          estimated_one_rm_factor: input.estimated_one_rm_factor,
        }))
    )
    .mutation(async ({ input, ctx }) => {
      // Load existing row (if any)
      const existing = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.user_id, ctx.user.id),
      });

      const patch: {
        defaultWeightUnit?: "kg" | "lbs";
        predictive_defaults_enabled?: boolean;
        right_swipe_action?: "collapse_expand" | "none";
        estimated_one_rm_factor?: number;
      } = {};

      if (typeof input.defaultWeightUnit !== "undefined") {
        patch.defaultWeightUnit = input.defaultWeightUnit;
      }
      if (typeof input.predictive_defaults_enabled !== "undefined") {
        patch.predictive_defaults_enabled = input.predictive_defaults_enabled;
      }
      if (typeof input.right_swipe_action !== "undefined") {
        patch.right_swipe_action = input.right_swipe_action;
      }
      if (typeof input.estimated_one_rm_factor !== "undefined") {
        patch.estimated_one_rm_factor = input.estimated_one_rm_factor;
      }

      if (existing) {
        // Update only provided fields
        if (Object.keys(patch).length > 0) {
          await ctx.db
            .update(userPreferences)
            .set(patch)
            .where(eq(userPreferences.user_id, ctx.user.id));
        }
      } else {
        // Create new preferences with safe defaults, then apply provided fields
        await ctx.db.insert(userPreferences).values({
          user_id: ctx.user.id,
          defaultWeightUnit: input.defaultWeightUnit ?? "kg",
          predictive_defaults_enabled: input.predictive_defaults_enabled ?? false,
          right_swipe_action: input.right_swipe_action ?? "collapse_expand",
          // Persist default if not provided
          estimated_one_rm_factor: input.estimated_one_rm_factor ?? 1 / 30,
        });
      }

      return { success: true };
    }),
});
