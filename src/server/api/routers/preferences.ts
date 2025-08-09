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

    // Return full preferences row when found to satisfy integration tests,
    // otherwise return default shape with only defaultWeightUnit (fallback 'kg').
    if (prefs) {
      return prefs;
    }
    return { defaultWeightUnit: "kg" } as const;
  }),

  // Update user preferences
  update: protectedProcedure
    .input(
      // Support legacy string input e.g., 'lbs' by normalizing into object shape.
      z
        .union([
          unitPreferenceSchema, // 'kg' | 'lbs'
          z.object({
            defaultWeightUnit: unitPreferenceSchema.optional(),
            predictive_defaults_enabled: z.boolean().optional(),
            right_swipe_action: z.enum(["collapse_expand", "none"]).optional(),
            estimated_one_rm_factor: z.number().min(0.02).max(0.05).optional(),
          }),
        ])
        .transform((input) => {
          if (typeof input === "string") {
            return { defaultWeightUnit: input };
          }
          return {
            defaultWeightUnit: input.defaultWeightUnit,
            predictive_defaults_enabled: input.predictive_defaults_enabled,
            right_swipe_action: input.right_swipe_action,
            estimated_one_rm_factor: input.estimated_one_rm_factor,
          };
        })
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
        });
      }

      return { success: true };
    }),
});
